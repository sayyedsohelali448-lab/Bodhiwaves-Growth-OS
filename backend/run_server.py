import os
import sys
import uvicorn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Starting Bodhiwaves Growth OS ERP Backend on http://127.0.0.1:{port} ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
