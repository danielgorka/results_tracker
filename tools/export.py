import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
import sys

collection = sys.argv[1] if len(sys.argv) > 1 else None

if not collection:
    print('Please specify a collection to export.')
    sys.exit(1)

input(f'Do you want to export all documents from collection "{collection}"? (Press Enter to continue)')

# Initialize the Firebase Admin SDK
cred = credentials.Certificate('../firebase-service-account.json')
firebase_admin.initialize_app(cred)

# Get a reference to the Firestore database
db = firestore.client()

# Define the query to retrieve documents
query = db.collection(collection)

print('Exporting documents...')

# Loop through the query results and add them to the list
list = []
for doc in query.stream():
    list.append(doc.to_dict())

# Save the list to a file
with open(f'exported/{collection}.json', 'w') as fp:
    json.dump(list, fp, default=str, indent=4)

print('Documents exported successfully!')
