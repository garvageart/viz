package jobs

import (
    libhttp "imagine/internal/http"
)

// NewProgressCallback creates a reusable progress reporter closure that broadcasts
// generic job-progress SSE events with a consistent payload shape.
// If sseBroker is nil, the returned function is a no-op.
func NewProgressCallback(
    sseBroker *libhttp.SSEBroker,
    jobId string,
    jobType string,
    imageId string,
    filename string,
) func(step string, progress int) {
    if sseBroker == nil {
        return func(step string, progress int) {}
    }

    return func(step string, progress int) {
        sseBroker.Broadcast("job-progress", map[string]interface{}{
            "jobId":    jobId,
            "type":     jobType,
            "imageId":  imageId,
            "filename": filename,
            "progress": progress,
            "status":   step,
            "step":     step,
        })
    }
}
