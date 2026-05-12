from flask_apscheduler import APScheduler
from flask_pymongo import PyMongo
from flask_socketio import SocketIO

mongo     = PyMongo()
socketio  = SocketIO()
scheduler = APScheduler()
