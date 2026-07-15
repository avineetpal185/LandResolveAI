from dataset_loader import datasets

def normalize_query(user_query):

    user_query = user_query.lower()

    synonyms = datasets.get("synonyms", {})

    for main_term, variations in synonyms.items():

        for word in variations:

            if word.lower() in user_query:

                user_query = user_query.replace(
                    word.lower(),
                    main_term.lower()
                )

    return user_query


def find_intent(user_query):

    user_query = user_query.lower()

    intents = datasets.get("intent_mapping", {})

    for item in intents.get("intents", []):

        for example in item.get("examples", []):

            example = example.lower()

            query_words = set(user_query.split())
            example_words = set(example.split())

            if len(query_words.intersection(example_words)) >= 2:
                return item["intent"]

    return "general_query"


def get_action_details(intent):

    mappings = datasets.get("action_mapping", {})

    for item in mappings.get("action_mappings", []):

        category = item.get("category", "").lower()

        if intent == "family_dispute" and "family" in category:
            return item

        if intent == "mutation_problem" and "mutation" in category:
            return item

        if intent == "fraud_case" and "fraud" in category:
            return item

        if intent == "boundary_dispute" and "boundary" in category:
            return item

        if intent == "inheritance_case" and "succession" in category:
            return item

    return None

def search_faq(user_query):

    user_query = user_query.lower()

    faq_data = datasets.get("faq", [])

    for item in faq_data:

        question = item.get("question", "").lower()

        if (
            question == user_query
            or question in user_query
            or user_query in question
        ):
            return item

    return None


def search_punjabi_query(user_query):

    user_query = user_query.lower()

    

    punjabi_data = datasets.get("punjabi_queries", {})

    for item in punjabi_data.get("punjabi_queries", []):

        query = item.get("query", "").lower()

        

        if query in user_query or user_query in query:
            
            return item

    return None

def search_village(user_query):

    user_query = user_query.lower()

    village_data = datasets.get("villages", {})

    for village in village_data.get("villages", []):

        village_name = village.get(
            "village_name",
            ""
        ).lower()

        if village_name in user_query:

            return {
                "village": village["village_name"],
                "tehsil": village["tehsil"],
                "district": village["district"]
            }

    return None

def get_followup_questions(intent):

    followup_data = datasets.get("followup_questions", {})

    return followup_data.get(intent, [])


def search_dataset(user_query):
    original_query = user_query.lower()

    punjabi_result = search_punjabi_query(original_query)

    user_query = normalize_query(user_query)

    if punjabi_result:
        intent = punjabi_result["intent"]
    else:
        intent = find_intent(user_query)

    faq_result = search_faq(user_query)
    village_result = search_village(user_query)

    result = {
       "intent": intent,
       "followup_questions": get_followup_questions(intent)
    }

    if faq_result:
        result["faq_answer"] = faq_result.get("answer")
        
    if village_result:
        result["village_info"] = village_result

    details = get_action_details(intent)

    if details:

        result["documents"] = details.get("documents_needed", [])
        result["offices"] = details.get("offices", [])
        result["officials"] = details.get("officials", [])
        result["next_steps"] = details.get("next_steps", [])

    return result