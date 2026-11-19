package jobs

// DefinitionClass is the kind of work a job definition performs. The zero
// value resolves to system: a definition that sets no class is a system job.
type DefinitionClass string

const (
	ClassSystem DefinitionClass = "system"
	ClassAsset  DefinitionClass = "asset"
)

// ClassOrSystem resolves the zero value to system.
func (d Definition) ClassOrSystem() DefinitionClass {
	if d.Class == "" {
		return ClassSystem
	}
	return d.Class
}
