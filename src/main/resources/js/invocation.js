var app = new Vue({
    el: '#app',
    data: {
        id: '',
        invocation: {},
        json: {},
        loading: false
    },
    mounted: function () {
        let params = new URLSearchParams(window.location.search);
        this.id = params.get('id');
        this.getInvocation();
    },
    methods: {
        clear: function () {
            this.invocation = null;
        },
        getInvocation: function () {
            this.clear();
            this.loading = true;

            let data = new AdonisTrack().getInvocation(this.id);

            console.log(data);
            console.log(data.json);

            this.invocation = data;
            this.json = JSON.stringify(data, null, 2);
            console.log(this.json);

            this.loading = false;
        }
    }
});
