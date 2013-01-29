Package.describe({
    summary: "ResourceManager coordinates the lifecycle of Backbone.Views that depend on multiple Models or Collections."
});

Package.on_use(function (api, where) {
    where = where || ['client', 'server'];

    api.add_files('dist/resourceManager.min.js', where);
});