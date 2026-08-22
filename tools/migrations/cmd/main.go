package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm/schema"

	"viz/internal/entities"
)

func main() {
	var name string
	var customTable string
	var customColumn string
	var customType string

	flag.StringVar(&name, "name", "", "Name of the migration (e.g. add_original_file_name)")
	flag.StringVar(&customTable, "table", "", "Target table name (optional)")
	flag.StringVar(&customColumn, "column", "", "Column name (optional)")
	flag.StringVar(&customType, "type", "", "Column SQL type (optional)")
	flag.Parse()

	if name == "" && flag.NArg() > 0 {
		name = flag.Arg(0)
	}

	if name == "" {
		fmt.Fprintf(os.Stderr, "Usage: make migrate-gen name=<migration_name>\n")
		os.Exit(1)
	}

	// Normalize name
	cleanName := strings.ToLower(strings.TrimSpace(name))
	cleanName = strings.ReplaceAll(cleanName, "-", "_")
	cleanName = strings.ReplaceAll(cleanName, " ", "_")

	timestamp := time.Now().UTC().Format("20060102150405")
	filename := fmt.Sprintf("%s_%s.sql", timestamp, cleanName)
	migrationsDir := filepath.Join("tools", "migrations", "sql")
	filePath := filepath.Join(migrationsDir, filename)

	if err := os.MkdirAll(migrationsDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create migrations directory: %v\n", err)
		os.Exit(1)
	}

	upSQL, downSQL := inferSQL(cleanName, customTable, customColumn, customType)

	content := fmt.Sprintf("-- +goose Up\n%s\n\n-- +goose Down\n%s\n", upSQL, downSQL)

	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to write migration file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Created Goose migration:\n  %s\n", filePath)
}

type matchCandidate struct {
	table    string
	colName  string
	field    *schema.Field
	priority int
}

func inferSQL(name, tableOverride, columnOverride, typeOverride string) (string, string) {
	// If explicit overrides provided
	if tableOverride != "" && columnOverride != "" {
		colType := "text"
		if typeOverride != "" {
			colType = typeOverride
		}
		up := fmt.Sprintf("ALTER TABLE %s ADD COLUMN IF NOT EXISTS %s %s;", tableOverride, columnOverride, colType)
		down := fmt.Sprintf("ALTER TABLE %s DROP COLUMN IF EXISTS %s;", tableOverride, columnOverride)
		return up, down
	}

	// Try to match against entity models
	models := entities.Models()
	namer := schema.NamingStrategy{}
	cache := &sync.Map{}

	var bestMatch *matchCandidate

	for _, model := range models {
		s, err := schema.Parse(model, cache, namer)
		if err != nil {
			continue
		}

		tableName := s.Table

		for _, field := range s.Fields {
			colName := field.DBName
			if colName == "" {
				continue
			}

			score := calculateMatchScore(name, colName, tableName)
			if score > 0 {
				if bestMatch == nil || score > bestMatch.priority || (score == bestMatch.priority && len(colName) > len(bestMatch.colName)) {
					bestMatch = &matchCandidate{
						table:    tableName,
						colName:  colName,
						field:    field,
						priority: score,
					}
				}
			}
		}
	}

	if bestMatch != nil {
		colType := postgresTypeForField(bestMatch.field)
		if typeOverride != "" {
			colType = typeOverride
		}

		up := fmt.Sprintf("ALTER TABLE %s ADD COLUMN IF NOT EXISTS %s %s;", bestMatch.table, bestMatch.colName, colType)
		down := fmt.Sprintf("ALTER TABLE %s DROP COLUMN IF EXISTS %s;", bestMatch.table, bestMatch.colName)
		return up, down
	}

	// Default generic scaffold
	up := "-- Write SQL statement for UP migration here\n"
	down := "-- Write SQL statement for DOWN migration here\n"
	return up, down
}

func calculateMatchScore(migName, colName, tableName string) int {
	if migName == colName {
		return 100
	}
	if migName == "add_"+colName+"_to_"+tableName {
		return 90
	}
	if migName == "add_"+colName {
		return 80
	}
	if migName == "add_"+colName+"_column" {
		return 70
	}
	if strings.Contains(migName, colName) {
		return 10 + len(colName)
	}
	return 0
}

func postgresTypeForField(field *schema.Field) string {
	// Check custom GORM tag
	if field.TagSettings["TYPE"] != "" {
		return strings.ToLower(field.TagSettings["TYPE"])
	}
	if field.Serializer != nil {
		return "jsonb"
	}

	switch field.DataType {
	case schema.Bool:
		return "boolean"
	case schema.Int, schema.Uint:
		return "bigint"
	case schema.Float:
		return "double precision"
	case schema.String:
		return "text"
	case schema.Time:
		return "timestamp with time zone"
	case schema.Bytes:
		return "bytea"
	default:
		goType := field.FieldType.String()
		if strings.Contains(goType, "Time") {
			return "timestamp with time zone"
		}
		if strings.Contains(goType, "int") {
			return "bigint"
		}
		if strings.Contains(goType, "bool") {
			return "boolean"
		}
		return "text"
	}
}
