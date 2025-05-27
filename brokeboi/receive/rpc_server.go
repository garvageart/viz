package main

***REMOVED***
***REMOVED***
	"log"
	"strconv"
***REMOVED***

	amqp "github.com/rabbitmq/amqp091-go"
	"go.les-is.online/imagine/utils"
***REMOVED***

func fib(n int***REMOVED*** int {
	if n == 0 {
		return 0
***REMOVED*** else if n == 1 {
		return 1
***REMOVED*** else {
		return fib(n-1***REMOVED*** + fib(n-2***REMOVED***
***REMOVED***
***REMOVED***

func main(***REMOVED*** {
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/"***REMOVED***
	utils.FailOnError(err, "Failed to connect to RabbitMQ"***REMOVED***
	defer conn.Close(***REMOVED***

	ch, err := conn.Channel(***REMOVED***
	utils.FailOnError(err, "Failed to open a channel"***REMOVED***
	defer ch.Close(***REMOVED***

	q, err := ch.QueueDeclare(
		"rpc_queue", // name
		false,       // durable
		false,       // delete when unused
		false,       // exclusive
		false,       // no-wait
		nil,         // arguments
	***REMOVED***
	utils.FailOnError(err, "Failed to declare a queue"***REMOVED***

	err = ch.Qos(
		1,     // prefetch count
		0,     // prefetch size
		false, // global
	***REMOVED***
	utils.FailOnError(err, "Failed to set QoS"***REMOVED***

	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		false,  // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	***REMOVED***
	utils.FailOnError(err, "Failed to register a consumer"***REMOVED***

	var forever chan struct{***REMOVED***

	go func(***REMOVED*** {
		ctx, cancel := context.WithTimeout(context.Background(***REMOVED***, 5*time.Second***REMOVED***
		defer cancel(***REMOVED***
		for d := range msgs {
			n, err := strconv.Atoi(string(d.Body***REMOVED******REMOVED***
			utils.FailOnError(err, "Failed to convert body to integer"***REMOVED***

			log.Printf(" [.] fib(%d***REMOVED***", n***REMOVED***
			response := fib(n***REMOVED***

			err = ch.PublishWithContext(ctx,
				"",        // exchange
				d.ReplyTo, // routing key
				false,     // mandatory
				false,     // immediate
				amqp.Publishing{
					ContentType:   "text/plain",
					CorrelationId: d.CorrelationId,
					Body:          []byte(strconv.Itoa(response***REMOVED******REMOVED***,
			***REMOVED******REMOVED***
			utils.FailOnError(err, "Failed to publish a message"***REMOVED***

			d.Ack(false***REMOVED***
	***REMOVED***
***REMOVED***(***REMOVED***

	log.Printf(" [*] Awaiting RPC requests"***REMOVED***
	<-forever //nolint:staticcheck
***REMOVED***
