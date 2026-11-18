package jobs

import (
	"encoding/json"
	"fmt"
	"reflect"
	"sort"

	"viz/internal/dto"
)

// Catalog is an immutable registry of worker definitions. It is assembled
// once at startup and supports safe concurrent reads.
type Catalog struct {
	definitions map[dto.JobTypeName]Definition
	order       []dto.JobTypeName
}

// NewCatalog validates and indexes worker definitions.
func NewCatalog(defs ...Definition) (*Catalog, error) {
	catalog := &Catalog{
		definitions: make(map[dto.JobTypeName]Definition, len(defs)),
	}

	for _, def := range defs {
		if def.Name == "" {
			return nil, fmt.Errorf("job definition has no name")
		}

		if !def.Name.Valid() {
			return nil, fmt.Errorf("job type %q is not a registered JobTypeName", def.Name)
		}

		if err := validatePayloadType(def.Payload); err != nil {
			return nil, fmt.Errorf("job type %q has an invalid payload type: %w", def.Name, err)
		}

		if def.Handle == nil {
			return nil, fmt.Errorf("job type %q has no queue handler", def.Name)
		}

		if _, exists := catalog.definitions[def.Name]; exists {
			return nil, fmt.Errorf("duplicate job definition %q", def.Name)
		}

		catalog.definitions[def.Name] = def
		catalog.order = append(catalog.order, def.Name)
	}

	sort.Slice(catalog.order, func(i, j int) bool {
		return catalog.order[i] < catalog.order[j]
	})

	return catalog, nil
}

func validatePayloadType(value Payload) error {
	if value == nil {
		return fmt.Errorf("payload must be a pointer to a struct")
	}

	t := reflect.TypeOf(value)
	if t.Kind() != reflect.Pointer || t.Elem().Kind() != reflect.Struct {
		return fmt.Errorf("payload must be a pointer to a struct, got %s", t)
	}

	return nil
}

// Get returns a definition by job type.
func (c *Catalog) Get(name dto.JobTypeName) (Definition, bool) {
	def, ok := c.definitions[name]
	return def, ok
}

// List returns definitions in a stable order.
func (c *Catalog) List() []Definition {
	defs := make([]Definition, 0, len(c.order))
	for _, name := range c.order {
		defs = append(defs, c.definitions[name])
	}

	return defs
}

// DecodeRaw decodes data into the worker's declared payload struct and
// validates it. This is the single entry point for turning request JSON into
// a typed, validated payload that Enqueue can consume.
func (c *Catalog) DecodeRaw(name dto.JobTypeName, raw json.RawMessage) (Payload, error) {
	def, ok := c.Get(name)
	if !ok {
		return nil, fmt.Errorf("unknown job type %q", name)
	}

	if len(raw) == 0 {
		raw = json.RawMessage(`{}`)
	}

	payloadType := reflect.TypeOf(def.Payload).Elem()
	payload := reflect.New(payloadType).Interface()
	if err := json.Unmarshal(raw, payload); err != nil {
		return nil, fmt.Errorf("invalid payload for %q: %w", name, err)
	}

	typedPayload, ok := payload.(Payload)
	if !ok {
		return nil, fmt.Errorf("payload for %q does not implement Payload", name)
	}

	if err := typedPayload.Validate(); err != nil {
		return nil, fmt.Errorf("payload validation failed for %q: %w", name, err)
	}

	return typedPayload, nil
}
