import httpx
import json

API_KEY = "sk-nano-6d7fe55e-6e67-40ae-b55a-2b47a81bd79d"
BASE_URL = "https://nano-gpt.com/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def test_image_models():
    print("Testing GET /image-models...")
    try:
        response = httpx.get(f"{BASE_URL}/image-models", headers=headers, timeout=10.0)
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            models_data = response.json()
            # The structure might be a list or a dict containing a list
            if isinstance(models_data, dict):
                data_list = models_data.get("data", models_data.get("models", []))
            else:
                data_list = models_data
            
            print(f"Total image models available: {len(data_list)}")
            print("First few image models:")
            for m in data_list[:15]:
                if isinstance(m, dict):
                    print(f" - {m.get('id')} ({m.get('name')})")
                else:
                    print(f" - {m}")
                    
            # Return list of ids
            ids = []
            for m in data_list:
                if isinstance(m, dict):
                    ids.append(m.get("id"))
                else:
                    ids.append(m)
            return ids
        else:
            print("Error Response:", response.text)
            return None
    except Exception as e:
        print("Exception:", e)
        return None

def test_imagegen(model_id):
    print(f"\nTesting POST /images/generations with model {model_id}...")
    payload = {
        "model": model_id,
        "prompt": "A beautiful cinematic dark mode abstract neon gradient, 3d render",
        "n": 1,
        "size": "1024x1024",
        "response_format": "url"
    }
    try:
        response = httpx.post(f"{BASE_URL}/images/generations", headers=headers, json=payload, timeout=30.0)
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            res_data = response.json()
            print("Successfully generated image!")
            print(json.dumps(res_data, indent=2))
        else:
            print("Error Response:", response.text)
    except Exception as e:
        print("Exception:", e)

if __name__ == "__main__":
    image_models = test_image_models()
    if image_models:
        # Filter out anything empty or None
        image_models = [m for m in image_models if m]
        if image_models:
            test_imagegen(image_models[0])
        else:
            print("No valid image models found.")
    else:
        print("Failed to fetch image models list.")
