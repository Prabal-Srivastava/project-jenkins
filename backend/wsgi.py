import sys
from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    # use_reloader=False fixes OSError 10038 on Windows with Python 3.14
    # where Werkzeug's select()-based reloader hits a closed socket bug.
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False,
        log_output=True,
    )
