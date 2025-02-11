# Weather APP

[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](https://forthebadge.com) [![forthebadge](https://forthebadge.com/images/badges/powered-by-electricity.svg)](https://forthebadge.com)

Educational project only.

## Getting Started

Open 2 terminal tabs in the project folder.

### Backend Setup (First tab)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
flask run --port 5000

### Frontend Setup (Second tab)
```bash
cd frontend
npm install
npx expo start // npx expo start --reset-clear if ui problem
