Analyze downstream impact of code changes. Given changed symbol(s), returns dependents classified by risk (breaking/behavioral).

Example usage:
  impact({ symbols: ["functionName"], changeType: "behavior_change" })
  impact({ symbols: ["helper", "utils"], changeType: "signature_change", maxDepth: 3 })

Required: symbols (array of symbol names), changeType (signature_change|removal|behavior_change|addition)