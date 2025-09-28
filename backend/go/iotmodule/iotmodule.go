package iotmodule

import (
	"context"
	"encoding/json"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/db"
	"github.com/SherClockHolmes/webpush-go"
	"google.golang.org/api/option"
)

var client *db.Client

func initFirebase() {
	if client != nil {
		return
	}
	cred := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	dbURL := os.Getenv("FIREBASE_DATABASE_URL")
	if cred == "" || dbURL == "" {
		log.Fatalf("Set GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_DATABASE_URL env vars")
	}

	ctx := context.Background()
	opt := option.WithCredentialsFile(cred)
	app, err := firebase.NewApp(ctx, &firebase.Config{DatabaseURL: dbURL}, opt)
	if err != nil {
		log.Fatalf("error initializing app: %v", err)
	}

	c, err := app.Database(ctx)
	if err != nil {
		log.Fatalf("error getting database client: %v", err)
	}
	client = c
}

// SetData writes arbitrary JSON data to /devices/{name}
func SetData(name string, data any) bool {
	initFirebase()
	ctx := context.Background()
	ref := client.NewRef("devices/" + name)
	if err := ref.Set(ctx, data); err != nil {
		log.Printf("SetData error: %v", err)
		return false
	}
	return true
}

// PushMessage reads subscriptions from /subscriptions and sends webpush notifications
func PushMessage(title string, message string) bool {
	initFirebase()
	ctx := context.Background()
	subsRef := client.NewRef("subscriptions")
	var subs map[string]json.RawMessage
	if err := subsRef.Get(ctx, &subs); err != nil {
		log.Printf("PushMessage: reading subscriptions failed: %v", err)
		return false
	}

	vapidPublic := os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidPublic == "" || vapidPrivate == "" || vapidSubject == "" {
		log.Printf("VAPID env vars not set")
		return false
	}

	payload := map[string]string{"title": title, "body": message}
	payloadB, _ := json.Marshal(payload)

	for id, raw := range subs {
		var sub webpush.Subscription

		// Try direct unmarshal first
		err := json.Unmarshal(raw, &sub)
		// json.Unmarshal may succeed but leave sub zero-valued if the JSON is an envelope
		// like {"subscription": {...}}. In that case try extracting the inner subscription.
		if err != nil || sub.Endpoint == "" || sub.Keys.P256dh == "" || sub.Keys.Auth == "" {
			var env struct {
				Subscription *webpush.Subscription `json:"subscription"`
			}
			if err2 := json.Unmarshal(raw, &env); err2 != nil {
				// If direct unmarshal returned nil err but produced an empty sub, include that info in the log
				if err != nil {
					log.Printf("invalid subscription %s: unmarshal errors: %v / %v; raw: %s", id, err, err2, string(raw))
				} else {
					log.Printf("invalid subscription %s: envelope unmarshal failed: %v; raw: %s", id, err2, string(raw))
				}
				continue
			}
			if env.Subscription == nil {
				log.Printf("invalid subscription %s: no subscription field; raw: %s", id, string(raw))
				continue
			}
			sub = *env.Subscription
		}

		// Basic validation: endpoint and keys
		if sub.Endpoint == "" || sub.Keys.P256dh == "" || sub.Keys.Auth == "" {
			log.Printf("webpush invalid subscription for %s: missing fields (endpoint/p256dh/auth); raw: %s", id, string(raw))
			continue
		}

		resp, err := webpush.SendNotification(payloadB, &sub, &webpush.Options{
			VAPIDPublicKey:  vapidPublic,
			VAPIDPrivateKey: vapidPrivate,
			Topic:           vapidSubject,
		})
		if err != nil {
			log.Printf("webpush send error for %s: %v; raw: %s", id, err, string(raw))
			continue
		}
		resp.Body.Close()
	}
	return true
}
