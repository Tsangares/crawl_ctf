#
from flask import Flask,render_template,request,send_file,session,redirect
from flask.sessions import SecureCookieSessionInterface
from flask_pymongo import PyMongo, ObjectId
from werkzeug.security import generate_password_hash
from utils import *
import json,os,io,random,json,math,hashlib,logging,time
import numpy as np
import poly
from typing import Dict, Any
import flask_login
from flask_login import current_user, login_user, logout_user
from flask_socketio import SocketIO, send, emit
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from supertokens_python.recipe.passwordless import ContactEmailOnlyConfig, CreateAndSendCustomEmailParameters

app = Flask(__name__)
config = json.load(open('config.json'))
app.secret_key = 'xrP8YWBt6iPL4W83vgpymSFyJyAycWtkO'
app.config["MONGO_URI"] = f"mongodb://{config['user']}:{config['pass']}@{config['domain']}/ctf"
mongo = PyMongo(app)
socketio = SocketIO(app)
session_cookie = SecureCookieSessionInterface().get_signing_serializer(app)
login_manager = flask_login.LoginManager(app)
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per minute"]
)
class User(flask_login.UserMixin):
    def __init__(self,token,name):
        if mongo.db.users.find_one({"token": token}) is None:
            mongo.db.users.insert_one({
                "token": token, 
                "name": name, 
                'carried': 0,
                'parsing': 0,
                'delay': 0,
                'user_agent': 0,
                'iframe': 0,
                'poly': 0,
                'orb_tokens': 2,
                'missles': 1,
                })
        self.id = token
        self.refresh()

    def refresh(self):
        self.data = mongo.db.users.find_one({"token": self.id})

    def addCarried(self,count=1):
        mongo.db.users.update_one({"token": self.id},{'$inc': {'carried': 1}})

    def setInstance(self,instance):
        mongo.db.users.update_one({'token': self.id},
        {
            '$set': {'instance': instance}
        })
    def getFriend(self,_id):
        if not isinstance(_id, ObjectId):
            _id = ObjectId(_id)
        friend = mongo.db.users.find_one({'_id': _id})
        orbs = self.getOrbs(owner=_id)
        return friend,orbs

    def addOrb(self,parent,color):
        if self.data['orb_tokens']<=0: return
        else:
            mongo.db.users.update_one({'_id': self.data['_id']},{'$inc': {'orb_tokens': -1}})
        if parent is not None:
            parent = ObjectId(parent)
        child = mongo.db.orbs.insert_one({
            'owner': self.data['_id'],
            'parent': parent,
            'color': color,
            'children': []
        })
        if parent is not None:
            mongo.db.orbs.update_one({
                '_id': parent
            },{
                '$push': {'children': child.inserted_id}
            })
        return str(child.inserted_id)

    def updateOrb(self,_id,color):
        mongo.db.orbs.update_one({'_id': ObjectId(_id)},{'$set': {'color': color}})
    
    def killOrb(self,_id):
        if self.data['missles']<=0: return
        else:
            mongo.db.users.update_one({'_id': self.data['_id']},{'$inc': {'missles': -1}})
        orb = mongo.db.orbs.find_one({'_id': _id})
        mongo.db.orbs.delete_one({'_id': _id})
        return orb['owner']

    def getOrbs(self, parent=None, owner=None):
        if owner is None:
            owner = self.data['_id']
        orbs = mongo.db.orbs.find({'owner': owner, 'parent': parent})
        orbs = [orb for orb in orbs]
        for orb in orbs:
            orb['children']=self.getOrbs(orb['_id'],owner=owner)
            orb['parent'] = str(orb['parent'])
            orb['_id'] = str(orb['_id'])
            del orb['owner']
        return orbs

def add_flag(flag,name):
    resp = mongo.db.flags.find_one({'flag': flag})
    if resp is None:
        mongo.db.flags.insert_one({'flag': flag,'name': name, 'used': False})

def claim_flag(flag,_id):
    if str(flag)=="696969":
        number = random.randint(10**10, 10**15)
        add_flag(number, "parsing")
        flag=number
    user = mongo.db.users.find_one({'_id': ObjectId(_id)})
    if flag > 10**20: flag = str(flag)
    token = mongo.db.flags.find_one({'flag': flag})
    if user is None or token is None or token['used']:
        token = mongo.db.flags.find_one({'flag': flag})
        return False
    mongo.db.flags.update_one({'flag': flag}, {'$set': {'used': True}})
    name = token['name']
    piece = {}
    if name == "parsing":
        piece = {'$inc': {'missles': 1}}
    elif name == "iframe":
        piece = {'$inc': {'carried': 10}}
    elif name == "user_agent":
        piece = {'$inc': {'carried': 10}}
    elif name == "delay":
        piece = {'$inc': {'orb_tokens': 1}}
    elif name == "poly":
        piece = {'$inc': {'carried': 500}}
    mongo.db.users.update_one({'_id': ObjectId(_id)},{'$inc': {token['name']: 1}} | piece)
    return token['name']

@login_manager.user_loader
def user_loader(token):
    print("Loading user!")
    return User(token,session['name'])

@login_manager.request_loader
def request_loader(request):
    name = session.get('name',None)
    token = session.get('token', None)
    if name is None or token is None: return
    return user_loader(token)

@login_manager.unauthorized_handler
def unauthorized_handler():
    return redirect('/')

@app.route('/poly')
def show_poly():
    return poly_challenge()

@app.route('/showPoly')
def img_disp():
    img = poly.run()
    return send_file(img,mimetype="image/png")


@app.route('/five',methods=["POST"])
def submit_answer():
    index = request.form.get('index',None)
    sides = request.form.get('answer',None)
    if index is not None and sides is not None:
        try:
            shape = mongo.db.poly.find_one({'index': str(index)})
        except ValueError:
            return {'error': "Invalid index type", 'success': False}
        if shape is None:
            return {'error': "Invalid index or answer; or you are trying to guess.", 'success': False}
        elif shape['expired']:
            return {'success': False, 'error': "Message is expired!"}
        elif str(shape['sides']) == str(sides).strip():
            flag=random.randint(10**10, 10**15)
            add_flag(flag, 'poly')
            mongo.db.poly.update_one({'index': str(index)},{'$set': {'expired': True}})
            return {'success': True, 'flag': flag}
    else:
        return {'error': "Missing index or answer", 'success': False}
@app.route('/five/<number>',methods=["GET"])
def alias_five(number):
    return get_poly(number)

@app.route('/poly/<number>')
def get_poly(number):
    polygon = mongo.db.poly.find_one({'index': number})
    if polygon is None:
        sides = hash(number)%6 + 3
        points = poly.get_poly_points(sides)
        mongo.db.poly.insert_one({'sides': sides, 'index': number, 'points': points, 'expired': False})
        polygon = mongo.db.poly.find_one({'index': number})
    else:
        points = polygon['points']
    if polygon['expired']:
        return {'error': 'This message has expired.','expired': True}
    try:
        size = int(request.args.get('size',100))
        page = int(request.args.get('page',1))
        data = {'page': page, 'length': size, 'max_page': round(len(points)/size), 'expired': False, 'points': points[int(page*size):int((page+1)*size)]}
    except TypeError as e:
        return {'error': "Invalid URL arguments.", 'stack': str(e)}
    return data

@app.route('/five')
def poly_challenge():
    number = random.randint(10**5,10**10)
    return render_template('poly.html',number=number)

@socketio.on('send_token')
def update_orb():
    token = random.randint(10**10,10**15)
    add_flag(token, 'delay')
    return token

@app.route('/four')
def javascript():
    return render_template('javascript.html')


@app.route('/jsonbaby')
def jsonbaby():
    number = random.randint(10**10,10**15)
    add_flag(number,'iframe')
    return render_template('fake.js',number=number)

@app.route('/three')
def iframe():
    return render_template('iframe.html')


@app.route('/two')
def crazy_parse():
    size = (random.randint(50,100),random.randint(50,80))
    x,y = size
    data = np.ones(size).tolist()
    color = np.ones(size).tolist()
    index = np.ones(size).tolist()
    col = random.randint(0,x)
    message = [str(random.randint(0,100)) for i in range(y)]
    add_flag(''.join(message), 'parsing')
    for i in range(x):
        for j in range(y):
            index[i][j] = random.randint(0,x*y)
            data[i][j] = random.randint(0,100)
            color[i][j] = str(hex(random.randint(0,16**6))).replace('0x','#')
            if i==col:
                data[i][j] = message[j]
    
    return render_template('crazy_parse.html',size=size,data=data,color=color,index=index,col=col)

@app.route('/one')
def user_agent():
    agents = []
    ip_address = request.remote_addr
    agent = request.headers.get('User-Agent')
    used = agent in agents
    token = random.random()
    m = hashlib.sha256()
    m.update(agent.encode('utf-8'))
    m.update(ip_address.encode('utf-8'))
    m.digest()
    token=int(m.hexdigest(),16)%(10**15)
    add_flag(token, 'user_agent')
    return render_template('user_agent.html',agent=agent,token=token,ip_address=ip_address)


@app.route('/home',methods=['GET'])
@flask_login.login_required
def command_and_control():
    session['instance'] = time.time()
    friends = mongo.db.users.find({})
    orbs = current_user.getOrbs()
    friends = sorted(friends,key=lambda a: a['carried'],reverse=True)
    return render_template(
        'account.html',
        name=session['name'].title(),
        user=current_user,
        instance=session['instance'],
        friends=friends,
        orbs=orbs
    )



@app.route('/claim',methods=['GET'])
def claim_flag_endpoint():
    _id = request.args.get('id',None)
    flag = request.args.get('flag',None)
    if _id is None and flag is None:
        return render_template('help_claim_tokens.html')
    elif _id is None or flag is None:
        return {'success': False, 'error': "Missing id or flag param."}
    else:
        try:
            response = claim_flag(int(flag),_id)
        except ValueError:
            response = claim_flag(flag,_id)
        if not response:
            return {'success': False, 'error': "This flag is spent or invalid."}
    return {'success': True, 'type': response, 'msg': "Sucessfully retrieved flag!"}


@app.route('/',methods=['GET'])
def homepage():
    if current_user.is_authenticated :
        return redirect('/home')
    return render_template('index.html')


def get_token(name):
    ip_address = request.remote_addr
    agent = request.headers.get('User-Agent')
    m = hashlib.sha256()
    m.update(agent.encode('utf-8'))
    m.update(ip_address.encode('utf-8'))
    m.update(name.encode('utf-8'))
    m.digest()
    token=m.hexdigest()
    return str(token)

@app.route('/',methods=['POST'])
def create_user_fingerpring():
    name = request.form.get('name',None)
    token = get_token(name)
    session['name'] = name
    session['token'] = token
    login_user(User(token,name),remember=True)
    return redirect('/home')



@socketio.on('getFriend')
@flask_login.login_required
def get_friend(friend):
    friend,orbs = current_user.getFriend(friend)
    return orbs

@socketio.on('test')
@flask_login.login_required
def test():
    return {'test': "test", "monkey": 1234}

@socketio.on('carried')
@flask_login.login_required
def complete_carry(data):
    current_user.addCarried()

@socketio.on('spawnOrb')
@flask_login.login_required
def spawn_orb(obj):
    orbId = current_user.addOrb(obj['parent'],obj['color'])
    if orbId is None: return
    parent = None
    if obj['parent'] is not None: parent = str(obj['parent'])
    emit('orbSpawned',
        {'orb': orbId, 'parent': parent,'owner': str(current_user.data['_id'])}
        ,broadcast=True)
    return orbId

@socketio.on('updateOrb')
@flask_login.login_required
def update_orb(obj):
    return current_user.updateOrb(obj['_id'],obj['color'])


@socketio.on('getOrbs')
@flask_login.login_required
def get_orbs():
    orbs = current_user.getOrbs()
    return json.dumps(orbs)

@socketio.on('killOrb')
@flask_login.login_required
def kill_orb(_id):
    owner = current_user.killOrb(ObjectId(_id))
    emit('orbKilled',{
        'orb': _id, 
        'owner': str(owner), 
        'name': current_user.data['name'],
        'attacker': str(current_user.data['_id'])
        },broadcast=True)


@socketio.on('newInstance')
@flask_login.login_required
def new_instance(instance):
    current_user.setInstance(instance)
    session['instance']=instance
    emit('checkInstance',broadcast=True)

@socketio.on('checkInstance')
@flask_login.login_required
def check_instance(instance):
    current_user.refresh()
    if current_user.data['instance']!=instance:
        emit('quitGame')

@socketio.on('syncSelf')
@flask_login.login_required
def sync_instance(instance):
    current_user.refresh()
    output = current_user.data.copy()
    del output['_id']
    return output

@socketio.on('refreshPlayers')
@flask_login.login_required
def sync_players():
    friends = mongo.db.users.find({})
    output = []
    for friend in friends:
        friend['_id'] = str(friend['_id'])
        output.append(friend)
    output = sorted(output,key=lambda a: a['carried'])
    return output

if __name__=="__main__":
    socketio.run(app,debug="true", host="0.0.0.0",port=8069)
