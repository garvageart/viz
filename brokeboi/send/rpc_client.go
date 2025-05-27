package main

***REMOVED***
***REMOVED***
	"log"
	"math/rand"
***REMOVED***
	"strconv"
	"strings"
***REMOVED***

	amqp "github.com/rabbitmq/amqp091-go"
	"go.les-is.online/imagine/utils"
***REMOVED***

func bodyFrom(args []string***REMOVED*** int {
	var s string
	if (len(args***REMOVED*** < 2***REMOVED*** || os.Args[1] == "" {
			s = "30"
***REMOVED*** else {
			s = strings.Join(args[1:], " "***REMOVED***
***REMOVED***
	num, err := strconv.Atoi(s***REMOVED***
	utils.FailOnError(err, "Failed to convert arg to integer"***REMOVED***
	return num
***REMOVED***

func randInt(min int, max int***REMOVED*** int {
	return min + rand.Intn(max-min***REMOVED***
***REMOVED***

func randomString(l int***REMOVED*** string {
	bytes := make([]byte, l***REMOVED***
	for i := range l {
		bytes[i] = byte(randInt(65, 90***REMOVED******REMOVED***
***REMOVED***
	return string(bytes***REMOVED***
***REMOVED***

func fibonacciRPC(n int***REMOVED*** (res int, err error***REMOVED*** {
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/"***REMOVED***
	utils.FailOnError(err, "Failed to connect to RabbitMQ"***REMOVED***
	defer conn.Close(***REMOVED***

	ch, err := conn.Channel(***REMOVED***
	utils.FailOnError(err, "Failed to open a channel"***REMOVED***
	defer ch.Close(***REMOVED***

	q, err := ch.QueueDeclare(
		"",    // name
		false, // durable
		false, // delete when unused
		true,  // exclusive
		false, // noWait
		nil,   // arguments
	***REMOVED***
	utils.FailOnError(err, "Failed to declare a queue"***REMOVED***

	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		true,   // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	***REMOVED***
	utils.FailOnError(err, "Failed to register a consumer"***REMOVED***

	corrId := randomString(32***REMOVED***

	ctx, cancel := context.WithTimeout(context.Background(***REMOVED***, 5*time.Second***REMOVED***
	defer cancel(***REMOVED***

	err = ch.PublishWithContext(ctx,
		"",          // exchange
		"rpc_queue", // routing key
		false,       // mandatory
		false,       // immediate
		amqp.Publishing{
			ContentType:   "text/plain",
			CorrelationId: corrId,
			ReplyTo:       q.Name,
			Body:          []byte(strconv.Itoa(n***REMOVED******REMOVED***,
	***REMOVED******REMOVED***
	utils.FailOnError(err, "Failed to publish a message"***REMOVED***

	for d := range msgs {
		if corrId == d.CorrelationId {
			res, err = strconv.Atoi(string(d.Body***REMOVED******REMOVED***
			utils.FailOnError(err, "Failed to convert body to integer"***REMOVED***
			break
	***REMOVED***
***REMOVED***

	return
***REMOVED***

func main(***REMOVED*** {
	rand.Seed(time.Now(***REMOVED***.UTC(***REMOVED***.UnixNano(***REMOVED******REMOVED***

	n := bodyFrom(os.Args***REMOVED***

	log.Printf(" [x] Requesting fib(%d***REMOVED***", n***REMOVED***
	res, err := fibonacciRPC(n***REMOVED***
	utils.FailOnError(err, "Failed to handle RPC request"***REMOVED***

	log.Printf(" [.] Got %d", res***REMOVED***
***REMOVED***
