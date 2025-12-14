import requests
import json

BASE_URL = "http://localhost:8001"

def test_login_and_profile():
    # 1. Login
    login_url = f"{BASE_URL}/api/api-token-auth/"
    creds = {"username": "driver1", "password": "driver123"}
    
    print(f"Logging in to {login_url}...")
    try:
        response = requests.post(login_url, json=creds)
        
        if response.status_code != 200:
            print(f"Login Failed: {response.status_code}")
            print(response.text)
            return

        token = response.json().get('token')
        print(f"Login Successful! Token: {token[:10]}...")
        
        # 2. Fetch Profile
        profile_url = f"{BASE_URL}/api/core/users/me/"
        headers = {"Authorization": f"Token {token}"}
        
        print(f"Fetching profile from {profile_url}...")
        profile_response = requests.get(profile_url, headers=headers)
        
        if profile_response.status_code == 200:
            print("Profile Fetch Successful!")
            print(json.dumps(profile_response.json(), indent=2))
        else:
            print(f"Profile Fetch Failed: {profile_response.status_code}")
            print(profile_response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login_and_profile()
