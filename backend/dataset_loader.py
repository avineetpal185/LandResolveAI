import json
from pathlib import Path

from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATASET_DIR = BASE_DIR / "dataset"

DATASETS = {}

def load_json(filename):
    try:
        with open(DATASET_DIR / filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return {}

def load_jsonl(filename):
    data = []

    try:
        with open(DATASET_DIR / filename, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()

                if line:
                    data.append(json.loads(line))

    except Exception as e:
        print(f"Error loading {filename}: {e}")

    return data


def load_all_datasets():

    DATASETS["offices"] = load_json("offices.json")
    DATASETS["officials"] = load_json("officials.json")
    DATASETS["documents"] = load_json("documents.json")
    DATASETS["land_types"] = load_json("land_types.json")
    DATASETS["disputes"] = load_json("disputes.json")
    DATASETS["districts"] = load_json("districts.json")
    DATASETS["tehsils"] = load_json("tehsils.json")
    DATASETS["villages"] = load_json("villages.json")

    DATASETS["synonyms"] = load_json("synonyms.json")
    DATASETS["abbreviations"] = load_json("abbreviations.json")

    DATASETS["intent_mapping"] = load_json("intent_mapping.json")
    DATASETS["action_mapping"] = load_json("action_mapping.json")
    DATASETS["service_mapping"] = load_json("service_mapping.json")
    DATASETS["office_service_mapping"] = load_json("office_service_mapping.json")

    DATASETS["decision_tree"] = load_json("decision_tree.json")
    DATASETS["emergency_mapping"] = load_json("emergency_mapping.json")

    DATASETS["conversation_examples"] = load_json("conversation_examples.json")
    DATASETS["punjabi_queries"] = load_json("punjabi_queries.json")

    DATASETS["measurement_units"] = load_json("measurement_units.json")
    DATASETS["punjabi_terms"] = load_json("punjabi_terms.json")
    DATASETS["land_terminology"] = load_json("land_terminology.json")
    DATASETS["user_queries"] = load_json("user_queries.json")

    DATASETS["faq"] = load_jsonl("faq.jsonl")
    DATASETS["followup_questions"] = load_json("followup_questions.json")

    print(f"Loaded {len(DATASETS)} datasets")

    return DATASETS


datasets = load_all_datasets()