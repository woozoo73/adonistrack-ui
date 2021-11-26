var app = new Vue({
    el: '#app',
    data: {
        id: '',
        invocation: {},
        json: {},
        mermaidSequence: '',
        request: {},
        response: {},
        invocations: [],
        loading: false
    },
    mounted: function () {
        let params = new URLSearchParams(window.location.search);
        this.id = params.get('id');
        this.getInvocation();
    },
    methods: {
        clear: function () {
            this.invocation = {};
            this.json = {};
            this.mermaidSequence = '';
            this.request = {};
            this.response = {};
            this.invocations = [];
        },
        makeMermaidSequence: function(json) {
            let text = '';

            text += this.line('sequenceDiagram');
            text += this.line();

            text += this.tab() + this.line('participant Client');
            text += this.tab() + this.line('participant Handler');

            const participants = this.getParticipants(json, []);
            if (participants) {
                for (const participant of participants) {
                    text += this.tab() + this.line('participant ' + participant + ' as ' + this.afterDot(participant));
                }
            }

            text += this.line();

            const calls = this.makeInvocaitons(json);

            console.log("calls.length=" + calls.length);

            if (calls) {
                for (const call of calls) {
                    if (call['type'] == 'Call') {
                        text += this.tab() + this.line(call['from'] + '->>+' + call['to'] + ': ' + call['message']);
                    }
                    if (call['type'] == 'Return') {
                        text += this.tab() + this.line(call['from'] + '-->>-' + call['to'] + ': ' + call['message']);
                    }
                }
            }

            console.log(text);

            return text;
        },
        makeInvocaitons: function(json) {
            const requestEvent = this.getRequest(json);
            const responseEvent = this.getResponse(json);

            let calls = [];

            if (requestEvent) {
                calls.push(this.getRequestCall(requestEvent));
            }

            if (json['childInvocationList']) {
                const methodCalls = this.getCalls('Handler', json['childInvocationList'][0], []);
                for (const call of methodCalls) {
                    calls.push(call);
                }
            }

            if (responseEvent) {
                calls.push(this.getResponseReturn(responseEvent));
            }

            return calls;
        },
        line: function(v) {
            if (!v) {
                return '\n';
            }
            return v + '\n';
        },
        space: function(v) {
            if (v) {
                return ' ' + v;
            }
            return v;
        },
        tab: function() {
            return '    ';
        },
        afterDot: function(v) {
            if (!v) {
                return v;
            }
            const index = v.lastIndexOf('.');
            if (index <= 0 && index > v.length - 1) {
                return v;
            }
            return v.substr(index + 1);
        },
        beforeDollar: function(v) {
            if (!v) {
                return v;
            }
            const index = v.indexOf('$');
            if (index <= 0) {
                return v;
            }
            return v.substr(0, index);
        },
        targetClassSimpleName: function(v) {
            return this.afterDot(this.beforeDollar(v));
        },
        getParticipants: function(invocation, participants) {
            console.log('----getParticipants');

            const participant = this.getParticipant(invocation);
            if (participant) {
                participants.push(this.getParticipant(invocation));
            }

            const childInvocationList = this.getChildInvocationList(invocation);
            if (childInvocationList) {
                for (const childInvocation of childInvocationList) {
                    this.getParticipants(childInvocation, participants);
                }
            }

            console.log(participants);
            return participants;
        },
        getParticipant: function(invocation) {
            console.log('----getParticipant');

            const target = this.getTarget(invocation);
            if (!target) {
                return null;
            }

            const declaringType = target['declaringType'];
            const proxyTarget = target['proxyTarget'];

            return proxyTarget ? proxyTarget : declaringType;
        },
        getCalls: function(parent, invocation, calls) {
            console.log('----getCalls');

            const call = this.getCall(parent, invocation);
            if (call) {
                calls.push(call);
            }

            const childInvocationList = this.getChildInvocationList(invocation);
            if (childInvocationList) {
                const parent = this.getParticipant(invocation);
                for (const childInvocation of childInvocationList) {
                    this.getCalls(parent, childInvocation, calls);
                }
            }

            const rtn = this.getReturn(parent, invocation);
            if (rtn) {
                calls.push(rtn);
            }

            console.log(calls);
            return calls;
        },
        getCall: function(parent, invocation) {
            const from = parent;
            const to = this.getParticipant(invocation);
            const method = this.getCallMethod(invocation);
            const valueType = this.getCallValueType(invocation);
            const value = this.getCallValue(invocation);
            const duration = this.getDuration(invocation);
            const message = this.getCallMessage(invocation);

            return {
                type: 'Call',
                from: from,
                to: to,
                method: method,
                valueType: valueType,
                value: value,
                duration: duration,
                message: message
            };
        },
        getReturn: function(parent, invocation) {
            const from = this.getParticipant(invocation);
            const to = parent;
            const method = this.getCallMethod(invocation);
            const valueType = this.getReturnValueType(invocation);
            const value = this.getReturnValue(invocation);
            const duration = this.getDuration(invocation);
            const message = this.getReturnMessage(invocation);

            return {
                type: 'Return',
                from: from,
                to: to,
                method: method,
                valueType: valueType,
                value: value,
                duration: duration,
                message: message
            };
        },
        getRequestCall: function(event) {
            if (!event) {
                return null;
            }

            const from = 'Client';
            const to = 'Handler';

            let message = '';
            const method = event['method'];
            const requestURI = event['requestURI'];

            if (method) {
                message += method;
            }
            if (requestURI) {
                message += this.space(requestURI);
            }

            return {
                type: 'Call',
                from: from,
                to: to,
                method: method,
                valueType: '',
                value: requestURI,
                duration: null,
                message: message
            };
        },
        getResponseReturn: function(event) {
            if (!event) {
                return '';
            }

            const from = 'Handler';
            const to = 'Client';

            let message = '';
            const status = event['status'];
            const reasonPhrase = event['reasonPhrase'];

            if (status) {
                message += status;
            }
            if (reasonPhrase) {
                message += this.space(reasonPhrase);
            }

            return {
                type: 'Return',
                from: from,
                to: to,
                method: '',
                valueType: '',
                value: status,
                duration: null,
                message: message
            };
        },
        getCallMethod: function(invocation) {
            const signatureInfo = this.getSignatureInfo(invocation);
            if (signatureInfo) {
                const message = signatureInfo['name'];
                if (message) {
                    return message;
                }
            }

            return "[Unknown]";
        },
        getCallValueType: function(invocation) {
            const argsInfoInfo = this.getArgsInfoInfo(invocation);
            if (!argsInfoInfo) {
                return [];
            }

            const v = [];
            for (const arg of argsInfoInfo) {
                v.push(arg['declaringType']);
            }

            return v;
        },
        getCallValue: function(invocation) {
            const argsInfoInfo = this.getArgsInfoInfo(invocation);
            if (!argsInfoInfo) {
                return [];
            }

            const v = [];
            for (const arg of argsInfoInfo) {
                v.push(arg['toStringValue']);
            }

            return v;
        },
        getReturnValueType: function(invocation) {
            const returnValueInfo = this.getReturnValueInfo(invocation);
            if (!returnValueInfo) {
                return null;
            }

            return returnValueInfo['declaringType'];
        },
        getReturnValue: function(invocation) {
            const returnValueInfo = this.getReturnValueInfo(invocation);
            if (!returnValueInfo) {
                return null;
            }

            return returnValueInfo['toStringValue'];
        },
        getCallMessage: function(invocation) {
            const signatureInfo = this.getSignatureInfo(invocation);
            if (signatureInfo) {
                const message = signatureInfo['name'];
                if (message) {
                    return message;
                }
            }

            return "[Unknown]";
        },
        getReturnMessage: function(invocation) {
            const returnValueInfo = this.getReturnValueInfo(invocation);
            if (returnValueInfo) {
                const message = returnValueInfo['declaringType'];
                if (message) {
                    return this.targetClassSimpleName(message);
                }
            }

            return "[Unknown]";
        },
        getRequestMessage: function(invocation) {
            const event = this.getRequest(invocation);
            if (!event) {
                return '';
            }

            let message = '';
            const method = event['method'];
            const requestURI = event['requestURI'];

            if (method) {
                message += method;
            }
            if (requestURI) {
                message += this.space(requestURI);
            }

            return message;
        },
        getResponseMessage: function(invocation) {
            const event = this.getResponse(invocation);
            if (!event) {
                return '';
            }

            let message = '';
            const status = event['status'];
            const reasonPhrase = event['reasonPhrase'];

            if (status) {
                message += status;
            }
            if (reasonPhrase) {
                message += this.space(reasonPhrase);
            }

            return message;
        },
        getRequest: function(invocation) {
            const eventList = this.getEventList(invocation);
            for (const event of eventList) {
                const type = event['type'];
                if (!type) {
                    continue;
                }
                if (type == 'REQUEST') {
                    return event['value'];
                }
            }
            return {};
        },
        getResponse: function(invocation) {
            const eventList = this.getEventList(invocation);
            for (const event of eventList) {
                const type = event['type'];
                if (!type) {
                    continue;
                }
                if (type == 'RESPONSE') {
                    return event['value'];
                }
            }
            return {};
        },
        getChildInvocationList: function(invocation) {
            return invocation['childInvocationList'];
        },
        getJoinPointInfo: function(invocation) {
            return invocation['joinPointInfo'];
        },
        getTarget: function(invocation) {
            const joinPointInfo = this.getJoinPointInfo(invocation);
            if (!joinPointInfo) {
                return null;
            }

            return joinPointInfo['target'];
        },
        getSignatureInfo: function(invocation) {
            const joinPointInfo = this.getJoinPointInfo(invocation);
            if (!joinPointInfo) {
                return null;
            }

            return joinPointInfo['signatureInfo'];
        },
        getArgsInfoInfo: function(invocation) {
            const joinPointInfo = this.getJoinPointInfo(invocation);
            if (!joinPointInfo) {
                return null;
            }

            return joinPointInfo['argsInfo'];
        },
        getReturnValueInfo: function(invocation) {
            console.log('----getReturnValueInfo');

            return invocation['returnValueInfo'];
        },
        getEventList: function(invocation) {
            return invocation['eventList'];
        },
        getDuration: function(invocation) {
            return invocation['duration'];
        },
        getInvocation: function () {
            this.clear();
            this.loading = true;

            fetch("invocation-06.json")
                .then(response => {
                    return response.json();
                })
                .then(data => {
                    this.json = data;
                    this.mermaidSequence = this.makeMermaidSequence(data);
                    this.id = data['id'];
                    this.request = this.getRequest(data);
                    this.response = this.getResponse(data);
                    this.invocations = this.makeInvocaitons(data);
                    console.log("");
                    console.log(this.mermaidSequence);
                    console.log(this.invocations);
                });

            this.loading = false;
        }
    }
});
