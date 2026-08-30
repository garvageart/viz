package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"reflect"
	"strings"

	"viz/internal/config"

	"github.com/invopop/jsonschema"
	orderedmap "github.com/pb33f/ordered-map/v2"
)

type structFieldCommentMap map[string]map[string]string

func getFieldComment(field *ast.Field) string {
	if field.Doc != nil {
		return strings.TrimSpace(field.Doc.Text())
	}

	if field.Comment != nil {
		return strings.TrimSpace(field.Comment.Text())
	}

	return ""
}

func getFieldJSONName(field *ast.Field) string {
	if field.Tag == nil {
		return ""
	}

	rawTag := strings.Trim(field.Tag.Value, "`")
	tag := reflect.StructTag(rawTag)
	jsonTag := tag.Get("json")
	if jsonTag == "" || jsonTag == "-" {
		return ""
	}

	name, _, _ := strings.Cut(jsonTag, ",")
	return name
}

func extractComments(typesFile string) (structFieldCommentMap, error) {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, typesFile, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	result := make(structFieldCommentMap)

	ast.Inspect(node, func(n ast.Node) bool {
		typeSpec, ok := n.(*ast.TypeSpec)
		if !ok {
			return true
		}

		structType, ok := typeSpec.Type.(*ast.StructType)
		if !ok {
			return true
		}

		fieldMap := make(map[string]string)
		for _, field := range structType.Fields.List {
			comment := getFieldComment(field)
			if comment == "" {
				continue
			}

			jsonName := getFieldJSONName(field)
			if jsonName == "" {
				continue
			}

			fieldMap[jsonName] = comment
		}

		result[typeSpec.Name.Name] = fieldMap
		return true
	})

	return result, nil
}

func makeOptional(s *jsonschema.Schema) {
	if s == nil {
		return
	}

	s.Required = nil
	if s.Properties == nil {
		return
	}

	for pair := s.Properties.Oldest(); pair != nil; pair = pair.Next() {
		makeOptional(pair.Value)
	}
}

func applyPropertiesComments(properties *orderedmap.OrderedMap[string, *jsonschema.Schema], comments map[string]string) {
	if properties == nil || len(comments) == 0 {
		return
	}

	for pair := properties.Oldest(); pair != nil; pair = pair.Next() {
		doc, found := comments[pair.Key]
		if !found {
			continue
		}

		if pair.Value.Description != "" {
			continue
		}

		pair.Value.Description = doc
	}
}

func applyComments(s *jsonschema.Schema, comments structFieldCommentMap) {
	if s == nil {
		return
	}

	applyPropertiesComments(s.Properties, comments["VizConfig"])

	for defName, defSchema := range s.Definitions {
		applyPropertiesComments(defSchema.Properties, comments[defName])
	}
}

func applyDefaults(s *jsonschema.Schema, val any) {
	v := reflect.ValueOf(val)
	if v.Kind() == reflect.Pointer {
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return
	}

	t := v.Type()
	structName := t.Name()

	var targetProps *orderedmap.OrderedMap[string, *jsonschema.Schema]
	if structName == "VizConfig" {
		targetProps = s.Properties
	} else if s.Definitions != nil {
		if def, ok := s.Definitions[structName]; ok {
			targetProps = def.Properties
		}
	}

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		fieldVal := v.Field(i)

		if field.Anonymous {
			applyDefaults(s, fieldVal.Interface())
			continue
		}

		jsonTag := field.Tag.Get("json")
		jsonName, _, _ := strings.Cut(jsonTag, ",")
		if jsonName == "" || jsonName == "-" {
			continue
		}

		if fieldVal.Kind() == reflect.Struct {
			applyDefaults(s, fieldVal.Interface())
			continue
		}

		if fieldVal.Kind() == reflect.String && fieldVal.String() == "" {
			continue
		}

		if targetProps != nil {
			if prop, ok := targetProps.Get(jsonName); ok && prop.Default == nil {
				prop.Default = fieldVal.Interface()
			}
		}
	}
}

func main() {
	outPath := flag.String("o", "resources/schemas/viz.schema.json", "Output file path for the generated schema")
	typesFile := flag.String("types", "internal/config/types.go", "Path to types.go")
	flag.Parse()

	reflector := new(jsonschema.Reflector)
	reflector.ExpandedStruct = true
	reflector.DoNotReference = false
	reflector.AllowAdditionalProperties = false

	schema := reflector.Reflect(&config.VizConfig{})
	schema.Title = "Viz Configuration Schema"
	schema.Description = "JSON Schema specification for viz.json runtime configuration file."

	makeOptional(schema)
	for _, def := range schema.Definitions {
		makeOptional(def)
	}

	schema.Properties.Set("$schema", &jsonschema.Schema{
		Type:        "string",
		Description: "Path or URI to the JSON Schema for editor validation and autocompletion.",
	})

	// Apply default values directly from DefaultConfig()
	applyDefaults(schema, config.DefaultConfig())

	comments, err := extractComments(*typesFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to extract comments from %s: %v\n", *typesFile, err)
	} else {
		applyComments(schema, comments)
	}

	data, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling JSON schema: %v\n", err)
		os.Exit(1)
	}

	data = append(data, '\n')

	if err := os.MkdirAll(filepath.Dir(*outPath), 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error creating output directory: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(*outPath, data, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing schema file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated %s successfully from Go backend config types.\n", *outPath)
}
