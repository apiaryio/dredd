import SocketServer, json, sys, os
from functools import wraps

__all__ = ['before_all',
           'after_all',
           'before_each',
           'after_each',
           'before',
           'after',
           'run_it']

HOST = '127.0.0.1'
PORT = 61321
WORKER_MESSAGE_DELIMITER = "\n"

class Hooks(object):
    def __init__(self):
        self._before_all = []
        self._after_all = []
        self._before_each = []
        self._before_each_validation = []
        self._after_each = []
        self._before_validation = {}
        self._before = {}
        self._after = {}

hooks = Hooks()

class HookHandler(SocketServer.StreamRequestHandler):
    """
    Main hook events handler, upon recpetion executes the correct hook
    based on the incoming event
    """
    def handle(self):
        global hooks
        try:
            while 1:
                msg = json.loads(self.rfile.readline().strip())
                if msg['event'] == "beforeAll":
                    map(lambda f: f(msg['data']), hooks._before_all)

                if msg['event'] == "afterAll":
                    map(lambda f: f(msg['data']), hooks._after_all)

                if msg['event'] == "beforeValidation":
                    map(lambda f: f(msg['data']), hooks._before_each_validation)
                    if msg['data']['name'] in hooks._before_validation:
                        hooks._before_validation[msg['data']['name']](msg['data'])

                if msg['event'] == "before":
                    map(lambda f: f(msg['data']), hooks._before_each)
                    if msg['data']['name'] in hooks._before:
                        hooks._before[msg['data']['name']](msg['data'])

                if msg['event'] == "after":
                    if msg['data']['name'] in hooks._after:
                        hooks._after[msg['data']['name']](msg['data'])
                    map(lambda f: f(msg['data']), hooks._after_each)

                self.wfile.write(json.dumps(msg))
                self.wfile.write(WORKER_MESSAGE_DELIMITER)
        except Exception as e:
            raise e

def before_all(f):
    global hooks
    hooks._before_all.append(f)
    return f

def after_all(f):
    global hooks
    print("wrapping %s"%(f))
    hooks._after_all.append(f)
    return f

def before_each(f):
    global hooks
    hooks._before_each.append(f)
    return f

def before_each_validation(f):
    global hooks
    hooks._before_each_validation.append(f)
    return f

def after_each(f):
    global hooks
    hooks._after_each.append(f)
    return f

def before_validation(name):
    def decorator(f):
        global hooks
        hooks._before_validation[name] = f
        return f

    return decorator

def before(name):
    def decorator(f):
        global hooks
        hooks._before[name] = f
        return f

    return decorator

def after(name):
    def decorator(f):
        global hooks
        hooks._after[name] = f
        return f

    return decorator

# *_all hooks

@before_all
def before_all_test(transactions):
    if 'hooks_modifications' not in transactions[0]:
        transactions[0]['hooks_modifications'] = []
    transactions[0]['hooks_modifications'].append("python before all mod")
    print('python before all hook')

@after_all
def after_all_test(transactions):
    if 'hooks_modifications' not in transactions[0]:
        transactions[0]['hooks_modifications'] = []
    transactions[0]['hooks_modifications'].append("python after all mod")
    print('python after all hook')

# *_each hooks
@before_each
def before_each_test(transaction):
    if 'hooks_modifications' not in transaction:
        transaction['hooks_modifications'] = []
    transaction['hooks_modifications'].append("python before each mod")
    print('python before each hook')

@before_each_validation
def before_each_validation_test(transaction):
    if 'hooks_modifications' not in transaction:
        transaction['hooks_modifications'] = []
    transaction['hooks_modifications'].append("python before each validation mod")
    print('python before each validation hook')

@after_each
def after_each_test(transaction):
    if 'hooks_modifications' not in transaction:
        transaction['hooks_modifications'] = []
    transaction['hooks_modifications'].append("python after each mod")
    print('python after each hook')

# *_each hooks
@before_validation('Machines > Machines collection > Get Machines')
def before_each_validation_test(transaction):
    if 'hooks_modifications' not in transaction:
        transaction['hooks_modifications'] = []
    transaction['hooks_modifications'].append("python before validation mod")
    print('python before validation hook')

@before("Machines > Machines collection > Get Machines")
def before_test(transaction):
    if 'hooks_modifications' not in transaction:
        transaction['hooks_modifications'] = []
    transaction['hooks_modifications'].append("python before mod")
    print('python before hook')

@after('Machines > Machines collection > Get Machines')
def after_test(transaction):
    if 'hooks_modifications' not in transaction:
        transaction['hooks_modifications'] = []
    transaction['hooks_modifications'].append("python after mod")
    print('python after hook')
    transaction['fail'] = 'Yay! Failed in python!'



# Unbuffered stdout and stderr
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 0)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', 0)
# Start the server
SocketServer.TCPServer.allow_reuse_address = True
server = SocketServer.TCPServer((HOST, PORT), HookHandler)
print('Dredd Python hooks worker is running')
server.serve_forever()
