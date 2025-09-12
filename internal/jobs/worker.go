package jobs

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
)

type Worker struct {
	Handler  JobHandler
	Name     string
	Topic    string
	mutex    sync.Mutex
	busy     bool
	canceled bool
	lastRun  time.Time
	ctx      context.Context
}

type JobHandler func(msg *message.Message) error

func (w *Worker) Context() context.Context {
	if w.ctx != nil {
		return w.ctx
	}

	return context.Background()
}

// Running checks if the Activity is currently running.
func (w *Worker) Running() bool {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	return w.busy
}

// Start marks the Activity as started and returns an error if it is already running.
func (w *Worker) Start() error {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	if w.canceled {
		return errors.New("still running")
	}

	if w.busy {
		return errors.New("already running")
	}

	w.busy = true
	w.canceled = false

	return nil
}

func (w *Worker) Stop() {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	w.busy = false
	w.canceled = false
	w.lastRun = time.Now().UTC()
}

func (w *Worker) Cancel() {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	if w.busy {
		w.canceled = true
	}
}

func (w *Worker) Canceled() bool {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	return w.canceled
}

func (w *Worker) LastRun() time.Time {
	w.mutex.Lock()
	defer w.mutex.Unlock()

	return w.lastRun
}

func (w *Worker) String() string {
	return w.Name
}
