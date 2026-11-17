package jobs

import (
	libhttp "viz/internal/http"
)

// NewProgressCallback creates a reusable progress reporter closure that broadcasts
// generic job-progress WebSocket events with a consistent payload shape.
// If wsBroker is nil, the returned function is a no-op.
func NewProgressCallback(
	ws *libhttp.WSBroker,
	uid string,
	jobType string,
	filename string,
) func(step string, progress int) {

	return func(step string, progress int) {
		ws.Broadcast("job-progress", map[string]any{
			"uid":      uid,
			"type":     jobType,
			"progress": progress,
		})
	}
}
