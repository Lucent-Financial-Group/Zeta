package main

import (
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"zeta/sha256"
	"zeta/tri_boolean"
	"zeta/zeta_id"

	"gopkg.in/yaml.v3"
)

func findRepoRoot() string {
	dir, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "Zeta.sln")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			panic("could not find repo root")
		}
		dir = parent
	}
}

type Sha256Vector struct {
	Id          string  `yaml:"id"`
	InputUtf8   *string `yaml:"input_utf8"`
	InputHex    *string `yaml:"input_hex"`
	ExpectedHex string  `yaml:"expected_hex"`
}

type Sha256Yaml struct {
	Vectors []Sha256Vector `yaml:"vectors"`
}

func TestCrossVerifySha256(t *testing.T) {
	repoRoot := findRepoRoot()
	fixtureDir := filepath.Join(repoRoot, "tests", "cross-verification", "sha256")
	vectorsPath := filepath.Join(fixtureDir, "vectors.yaml")

	data, err := os.ReadFile(vectorsPath)
	if err != nil {
		t.Fatalf("failed to read vectors.yaml: %v", err)
	}

	var y Sha256Yaml
	if err := yaml.Unmarshal(data, &y); err != nil {
		t.Fatalf("failed to unmarshal vectors.yaml: %v", err)
	}

	outMap := make(map[string]string)
	for _, v := range y.Vectors {
		var input []byte
		if v.InputUtf8 != nil {
			input = []byte(*v.InputUtf8)
		} else if v.InputHex != nil {
			dec, err := hex.DecodeString(*v.InputHex)
			if err != nil {
				t.Fatalf("failed to decode hex input for %s: %v", v.Id, err)
			}
			input = dec
		}
		outMap[v.Id] = sha256.HashBytes(input)
	}

	jsonData, err := json.MarshalIndent(outMap, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal JSON: %v", err)
	}

	// Append newline to match prettier/standard JSON formatting
	jsonStr := string(jsonData) + "\n"

	outputPath := filepath.Join(fixtureDir, "go-output.json")
	if err := os.WriteFile(outputPath, []byte(jsonStr), 0644); err != nil {
		t.Fatalf("failed to write go-output.json: %v", err)
	}
}

type TriVector struct {
	Id          string   `yaml:"id"`
	Type        string   `yaml:"type"`
	State       string   `yaml:"state,omitempty"`
	Left        string   `yaml:"left,omitempty"`
	Right       string   `yaml:"right,omitempty"`
	High        string   `yaml:"high,omitempty"`
	Decoder     string   `yaml:"decoder,omitempty"`
	Low         string   `yaml:"low,omitempty"`
	EncodeValue *float64 `yaml:"encode_value,omitempty"`
}

type TriYaml struct {
	Vectors []TriVector `yaml:"vectors"`
}

func parseTri(s string) triboolean.Tri {
	switch s {
	case "T":
		return triboolean.Tri{S: triboolean.T}
	case "F":
		return triboolean.Tri{S: triboolean.F}
	case "N":
		return triboolean.Tri{S: triboolean.N}
	}
	panic("invalid tri state: " + s)
}

func triSliceToString(trits []triboolean.Tri) string {
	res := ""
	for _, t := range trits {
		res += string(t.S)
	}
	return res
}

func TestCrossVerifyTriBoolean(t *testing.T) {
	repoRoot := findRepoRoot()
	fixtureDir := filepath.Join(repoRoot, "tests", "cross-verification", "tri-boolean")
	vectorsPath := filepath.Join(fixtureDir, "vectors.yaml")

	data, err := os.ReadFile(vectorsPath)
	if err != nil {
		t.Fatalf("failed to read vectors.yaml: %v", err)
	}

	var y TriYaml
	if err := yaml.Unmarshal(data, &y); err != nil {
		t.Fatalf("failed to unmarshal vectors.yaml: %v", err)
	}

	outMap := make(map[string]interface{})
	for _, v := range y.Vectors {
		switch v.Type {
		case "unary":
			tr := parseTri(v.State)
			measVal, err := triboolean.Measure(tr)
			measureOk := err == nil
			measureFeedback := ""
			if err != nil {
				measureFeedback = err.Error()
			}

			notVal := triboolean.NotTri(tr)
			coopVal := triboolean.Cooperate(tr)
			mapNotVal := triboolean.MapTri(tr, func(b bool) bool { return !b })
			bindNotVal := triboolean.BindTri(tr, func(b bool) triboolean.Tri { return triboolean.FromBool(!b) })
			bindToTVal := triboolean.BindTri(tr, func(b bool) triboolean.Tri { return triboolean.Tri{S: triboolean.T} })

			outMap[v.Id] = map[string]interface{}{
				"type":            "unary",
				"state":           v.State,
				"isLiving":        tr.IsLiving(),
				"isCertain":       tr.IsCertain(),
				"notState":        string(notVal.S),
				"cooperateState":  string(coopVal.S),
				"measureOk":       measureOk,
				"measureValue":    measVal,
				"measureFeedback": measureFeedback,
				"mapNot":          string(mapNotVal.S),
				"bindNot":         string(bindNotVal.S),
				"bindToT":         string(bindToTVal.S),
			}
		case "binary":
			left := parseTri(v.Left)
			right := parseTri(v.Right)
			andVal := triboolean.AndTri(left, right)
			orVal := triboolean.OrTri(left, right)

			outMap[v.Id] = map[string]interface{}{
				"type":        "binary",
				"left":        v.Left,
				"right":       v.Right,
				"expectedAnd": string(andVal.S),
				"expectedOr":  string(orVal.S),
			}
		case "float":
			var highTrits []triboolean.Tri
			for _, c := range v.High {
				highTrits = append(highTrits, parseTri(string(c)))
			}
			var decoderTrits []triboolean.Tri
			for _, c := range v.Decoder {
				decoderTrits = append(decoderTrits, parseTri(string(c)))
			}
			var lowTrits []triboolean.Tri
			for _, c := range v.Low {
				lowTrits = append(lowTrits, parseTri(string(c)))
			}

			tf := triboolean.FromTrits(highTrits, decoderTrits, lowTrits)
			decResult := triboolean.Decode(tf)

			expectedOk := decResult.Ok
			expectedValue := decResult.Value
			expectedFeedback := ""
			if !decResult.Ok {
				expectedFeedback = decResult.Feedback.Reason
			}

			floatRes := map[string]interface{}{
				"type":             "float",
				"high":             v.High,
				"decoder":          v.Decoder,
				"low":              v.Low,
				"expectedOk":       expectedOk,
				"expectedValue":    expectedValue,
				"expectedFeedback": expectedFeedback,
			}

			if v.EncodeValue != nil {
				val := *v.EncodeValue
				floatRes["encodeValue"] = val
				encResult := triboolean.FromValue(val, tf.Shape)
				floatRes["expectedEncodeOk"] = encResult.Ok
				if encResult.Ok {
					floatRes["expectedEncodeHigh"] = triSliceToString(encResult.Float.High)
					floatRes["expectedEncodeDecoder"] = triSliceToString(encResult.Float.Decoder)
					floatRes["expectedEncodeLow"] = triSliceToString(encResult.Float.Low)
				} else {
					floatRes["expectedEncodeDetail"] = encResult.Feedback.Detail
				}
			}

			outMap[v.Id] = floatRes
		}
	}

	jsonData, err := json.MarshalIndent(outMap, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal JSON: %v", err)
	}

	jsonStr := string(jsonData) + "\n"

	outputPath := filepath.Join(fixtureDir, "go-output.json")
	if err := os.WriteFile(outputPath, []byte(jsonStr), 0644); err != nil {
		t.Fatalf("failed to write go-output.json: %v", err)
	}
}

type ZetaIdVector struct {
	Id            string `yaml:"id"`
	Version       uint8  `yaml:"version"`
	Timestamp     uint64 `yaml:"timestamp"`
	Chromosome    uint8  `yaml:"chromosome"`
	Category      uint8  `yaml:"category"`
	Firefly       uint8  `yaml:"firefly"`
	AuthorityType string `yaml:"authority_type"`
	AuthorityRaw  *uint8 `yaml:"authority_raw"`
	Persona       uint8  `yaml:"persona"`
	MomentumType  string `yaml:"momentum_type"`
	MomentumRaw   *uint8 `yaml:"momentum_raw"`
	Location      uint8  `yaml:"location"`
	ExpectedHex   string `yaml:"expected_hex"`
}

type ZetaIdYaml struct {
	Vectors []ZetaIdVector `yaml:"vectors"`
}

type ZetaIdOutput struct {
	Hex             string `json:"hex"`
	RoundtripOk     bool   `json:"roundtripOk"`
	MatchesExpected bool   `json:"matchesExpected"`
}

func observationsEqual(a, b zeta_id.ZetaObservation) bool {
	aAuthVal, _ := zeta_id.AuthorityToByte(a.Authority)
	bAuthVal, _ := zeta_id.AuthorityToByte(b.Authority)
	aMomVal, _ := zeta_id.MomentumToByte(a.Momentum)
	bMomVal, _ := zeta_id.MomentumToByte(b.Momentum)
	return a.Version == b.Version &&
		a.Timestamp == b.Timestamp &&
		a.Chromosome == b.Chromosome &&
		a.Category == b.Category &&
		a.Firefly == b.Firefly &&
		a.Authority.Type == b.Authority.Type &&
		aAuthVal == bAuthVal &&
		a.Persona == b.Persona &&
		a.Momentum.Type == b.Momentum.Type &&
		aMomVal == bMomVal &&
		a.Location == b.Location
}

func TestCrossVerifyZetaId(t *testing.T) {
	repoRoot := findRepoRoot()
	fixtureDir := filepath.Join(repoRoot, "tests", "cross-verification", "zeta-id")
	vectorsPath := filepath.Join(fixtureDir, "vectors.yaml")

	data, err := os.ReadFile(vectorsPath)
	if err != nil {
		t.Fatalf("failed to read vectors.yaml: %v", err)
	}

	var y ZetaIdYaml
	if err := yaml.Unmarshal(data, &y); err != nil {
		t.Fatalf("failed to unmarshal vectors.yaml: %v", err)
	}

	outMap := make(map[string]ZetaIdOutput)
	for _, v := range y.Vectors {
		var authRaw uint8
		if v.AuthorityRaw != nil {
			authRaw = *v.AuthorityRaw
		}
		var momRaw uint8
		if v.MomentumRaw != nil {
			momRaw = *v.MomentumRaw
		}

		obs := zeta_id.ZetaObservation{
			Version:    v.Version,
			Timestamp:  v.Timestamp,
			Chromosome: v.Chromosome,
			Category:   v.Category,
			Firefly:    v.Firefly,
			Authority:  zeta_id.Authority{Type: zeta_id.AuthorityType(v.AuthorityType), Value: authRaw},
			Persona:    v.Persona,
			Momentum:   zeta_id.Momentum{Type: zeta_id.MomentumType(v.MomentumType), Value: momRaw},
			Location:   v.Location,
		}

		packed, err := zeta_id.Pack(obs, zeta_id.DeterministicEnv{})
		if err != nil {
			t.Fatalf("failed to pack observation for %s: %v", v.Id, err)
		}
		hexVal := zeta_id.ToHex(packed)

		unpacked := zeta_id.Unpack(packed)
		roundtripOk := observationsEqual(obs, unpacked)
		matchesExpected := hexVal == v.ExpectedHex

		outMap[v.Id] = ZetaIdOutput{
			Hex:             hexVal,
			RoundtripOk:     roundtripOk,
			MatchesExpected: matchesExpected,
		}
	}

	jsonData, err := json.MarshalIndent(outMap, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal JSON: %v", err)
	}

	jsonStr := string(jsonData) + "\n"

	outputPath := filepath.Join(fixtureDir, "go-output.json")
	if err := os.WriteFile(outputPath, []byte(jsonStr), 0644); err != nil {
		t.Fatalf("failed to write go-output.json: %v", err)
	}
}
