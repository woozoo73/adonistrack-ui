class AdonisTrack {
    getInvocations() {
        $.ajax({
            url: "http://localhost:8080/adonis-track/invocations",
            method: "GET",
            dataType: "json",
            async: false,
            success: function(data) {
                return data;
            }
        })
        return null;
    }
}
