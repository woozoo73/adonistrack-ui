var app = new Vue({
    el: '#app',
    data: {
        id: '',
        invocation: {},
        json: {},
        mermaidSequence: '',
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
        },
        makeMermaidSequence: function(json) {
            let text = '';

            text += this.line('sequenceDiagram');

            text += this.line('participant Client');
            text += this.line('participant Handler');

            console.log('=========================');
            console.log(this.json['childInvocationList']);
            console.log('=========================');

            const participants = this.getParticipants(json, []);
            if (participants) {
                for (const participant of participants) {
                    text += this.line('participant ' + participant + ' as ' + this.afterDot(participant));
                }
            }

            const requestMessage = this.getRequestMessage(json);
            if (requestMessage) {
                text += this.line('Client->>Handler: ' + requestMessage);
            }

            let calls = this.getCalls('Handler', json['childInvocationList'][0], []);

            console.log("calls.length=" + calls.length);
            if (calls) {
                for (const call of calls) {
                    if (call['type'] == 'c') {
                        text += this.line(call['f'] + '->>' + call['t'] + ': ' + call['message']);
                    }
                    if (call['type'] == 'r') {
                        text += this.line(call['f'] + '-->>' + call['t'] + ': ' + call['message']);
                    }
                }
            }

            const responseMessage = this.getResponseMessage(json);
            if (responseMessage) {
                text += this.line('Handler-->>Client: ' + responseMessage);
            }

            console.log(text);

            return text;
        },
        line: function(v) {
            return v + '\n';
        },
        space: function(v) {
            if (v) {
                return ' ' + v;
            }
            return v;
        },
        afterDot: function(v) {
            const index = v.lastIndexOf('.');
            if (index <= 0 && index > v.length - 1) {
                return v;
            }
            return v.substr(index + 1);
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

            const signatureInfo = this.getSignatureInfo(invocation);
            if (!signatureInfo) {
                return null;
            }

            console.log(signatureInfo['declaringType']);
            return signatureInfo['declaringType'];
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
        getCall: function(parent, invocatoin) {
            const f = parent;
            const t = this.getParticipant(invocatoin);
            const message = this.getCallMessage(invocatoin);

            return {
                f: f,
                t: t,
                message: message,
                type: 'c'
            };
        },
        getReturn: function(parent, invocatoin) {
            const f = this.getParticipant(invocatoin);
            const t = parent;
            const message = this.getReturnMessage(invocatoin);

            return {
                f: f,
                t: t,
                message: message,
                type: 'r'
            };
        },
        getCallMessage: function(invocation) {
            const signatureInfo = this.getSignatureInfo(invocation);
            if (signatureInfo) {
                const message = signatureInfo['shortString'];
                if (message) {
                    return message;
                }
            }

            return "[Unknown]";
        },
        getReturnMessage: function(invocation) {
            const returnValueInfo = this.getReturnValueInfo(invocation);
            if (returnValueInfo) {
                const message = returnValueInfo['toStringValue'];
                if (message) {
                    return message;
                }
            }

            return "[Unknown]";
        },
        getRequestMessage: function(invocation) {
            const event = this.getRequestEvent(invocation);
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
            const event = this.getResponseEvent(invocation);
            if (!event) {
                return '';
            }

            let message = '';
            const status = event['status'];

            message += status;

            return message;
        },
        getRequestEvent: function(invocation) {
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
        },
        getResponseEvent: function(invocation) {
            const eventList = this.getEventList(invocation);
            let responseEvent = null;
            for (const event of eventList) {
                const type = event['type'];
                if (!type) {
                    continue;
                }
                if (type == 'RESPONSE') {
                    responseEvent = event['value'];
                }
            }
            return responseEvent;
        },
        getChildInvocationList: function(invocation) {
            return invocation['childInvocationList'];
        },
        getSignatureInfo: function(invocation) {
            const joinPointInfo = invocation['joinPointInfo'];
            if (!joinPointInfo) {
                return null;
            }

            return joinPointInfo['signatureInfo'];
        },
        getReturnValueInfo: function(invocation) {
            console.log('----getReturnValueInfo');

            const returnValueInfo = invocation['returnValueInfo'];
            return returnValueInfo;
        },
        getEventList: function(invocation) {
            return invocation['eventList'];
        },
        getInvocation: function () {
            this.clear();
            this.loading = true;

            let data = new AdonisTrack().getInvocation(this.id);

            console.log(data);
            console.log(data.json);

            this.json = data;
            this.mermaidSequence = this.makeMermaidSequence(data);

            this.loading = false;
        }
    }
});
