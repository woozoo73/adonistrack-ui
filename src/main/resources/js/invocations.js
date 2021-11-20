const app = new Vue({
    el: '#app',
    data: {
        invocations: [],
        loading: false
    },
    mounted: function () {
        this.getInvocations();
    },
    methods: {
        clear: function () {
            this.invocations = [];
        },
        getInvocations: function () {
            this.clear();
            this.loading = true;

            let data = new AdonisTrack().getInvocations();

            for (let d of data) {
                this.invocations.push({
                    id: d['id'],
                    start: new Date(d['start']),
                    duration: d['duration'],
                    method: d['method'],
                    uri: d['requestURI'],
                    status: d['status']
                });
            }

            this.loading = false;
        }
    }
});
