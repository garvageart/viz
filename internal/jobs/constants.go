package jobs

const (
	JobTypeCron = "cron"
	JobTypeOnce = "once"

	JobStatusPending = "pending"
	JobStatusRunning = "running"
	JobStatusSuccess = "success"
	JobStatusFailed  = "failed"
	JobStatusSkipped = "skipped"

	JobCommandStart  = "start"
	JobCommandPause  = "pause"
	JobCommandResume = "resume"
	JobCommandStop   = "stop"
)
