package debug

import "fmt"

// DebugService provides debug service functionality for the application.
type DebugService struct {
	enabled bool
	port    int
}

// NewDebugService creates a new DebugService instance with the given configuration.
func NewDebugService(enabled bool, port int) *DebugService {
	return &DebugService{
		enabled: enabled,
		port:    port,
	}
}

// Status returns a status string indicating whether the debug service is running and its port.
func (s *DebugService) Status() string {
	if s.enabled {
		return fmt.Sprintf("Debug service running on port :%d", s.port)
	}
	return "Debug service disabled"
}
