package main

import (
	"fmt"
	"time"

	"github.com/yourname/iotmodule"
)

func main() {
	// Example: write device data
	ok := iotmodule.SetData("thermostat", map[string]any{
		"icon": "thermo",
		"temp": 21.5,
		"last": time.Now().Format(time.RFC3339),
	})
	fmt.Println("SetData ok?", ok)

	// Send a push message to all subscriptions saved in Firebase
	ok = iotmodule.PushMessage("Hello", "Test push from home server")
	fmt.Println("PushMessage ok?", ok)
}
