define([
        '../../config',
        '../../model',
        '../../vendor/mustache',
        'text!views/ImportDirectory/DirURL.html',
        './DirTypeView'
        ], 
        function(config, model, Mustache, template, DirTypeView){
    
    return Backbone.View.extend({
        initialize:function(){
            // Make it easy to reference this object in event handlers
            _.bindAll(this)
            this.init_changes_listener()
        },
        render: function(){
            $('#steps').html(Mustache.render(template))
            this.delegateEvents()
        },
        events: {
            'keyup #url':'get_church_dir_from_url'
        },
        init_changes_listener:function(event){
            if (typeof window.app.watching_import_directory_view_changes == 'undefined'){
                window.app.watching_import_directory_view_changes = true;
                var thiz = this
                changes.onChange(function(change){
                    var change_id = change.results[0].id
                    var rev = change.results[0].changes[0].rev
                    // Determine if the changed document is the dir we are editing
                    if (typeof window.app.dir != 'undefined' && change_id == window.app.dir.get('_id')){
                        // Fetch document's new contents from db
                        // TODO: Why doesn't backbone-couchdb automatically update the
                        //  model object for me when the associated doc changes in the db?
                        window.app.dir.fetch({success:function(model,response){
                            
                            // ----------------------------------------------------------
                            // These are the main cases - different types of changes that
                            //  need to be handled
                            
                            // console.log(new Date().getTime() + '\tb: start here')
                            // TODO: Fix this order so it works right?
                            //  Why is this creating an infinite loop?
                            
                            // Display directory's first page of content
                            if (window.app.dir.get('url_html') &&
                                window.app.dir.get('get_url_html') == 'gotten'){
                                var html = window.app.dir.get('url_html')
                                // Determine whether this URL's data is HTML, RSS, or KML
                                if (html.indexOf("</html>") > -1){
                                    window.app.dir.set('pagetype', 'html')
                                    // Determine what type of directory this is
                                    // batchgeo
                                    if (thiz.uses_batch_geo(html) === true && 
                                        typeof window.app.dir.get('get_batchgeo_map_html') == 'undefined' &&
                                        typeof window.app.dir.get('get_json') == 'undefined'){
                                        // console.log(new Date().getTime() + '\tb: get_batchgeo_map_html: ' + window.app.dir.get('get_batchgeo_map_html'))
                                        console.log('get_batchgeo_map_html: ' + window.app.dir.get('get_batchgeo_map_html'))
                                        console.log('get_json: ' + window.app.dir.get('get_json'))
                                        console.log(new Date().getTime() + '\tb: getting batchgeo_map_html')
                                        thiz.process_batch_geo(html)
                                    }
                                }
                                else if (html.indexOf("</rss>") > -1){
                                    // TODO: Display the right form controls for an RSS feed
                                    window.app.dir.set('pagetype', 'rss')
                                }
                                else if (html.indexOf("<kml") > -1){
                                    // TODO: Display the right form controls for a KML feed
                                    window.app.dir.set('pagetype', 'kml')
                                }
                                else if (html.indexOf("{") === 0 || 
                                    // batchgeo format
                                    html.indexOf("per = {") === 0){
                                    window.app.dir.set('pagetype', 'json')
                                }
                                else { // We got an error code
                                }
                                window.app.dir.set('get_url_html', '')
                                // TODO: Is this the right place to save the dir?
                                //    https://blueprints.launchpad.net/reformedchurcheslocator/+spec/decide-whether-to-save-dir
                                //window.app.dir.save({_id:dir.get('_id')})
                            }
                            if (typeof window.app.dir.get('batchgeo_map_html') !== 'undefined' && 
                                window.app.dir.get('get_batchgeo_map_html') == 'gotten'){
                                console.log(new Date().getTime() + '\tb: getting batchgeo_json')
                                thiz.get_batchgeo_json()
                            }
                            if (typeof window.app.dir.get('json') !== 'undefined' && 
                                window.app.dir.get('get_json') == 'gotten'){
                                console.log(new Date().getTime() + '\tb: parsing batchgeo_json')
                                thiz.batchgeo_parse_json()
                            }
                            
                            // ----------------------------------------------------------

                        }})
                    }
                })
            }
        },
        delay:(function(){
          var timer = 0;
          return function(callback, ms){
            clearTimeout (timer);
            timer = setTimeout(callback, ms);
          };
        })(),
        get_church_dir_from_url:function(event){
            // Delay this to run after typing has stopped for 3 seconds, so we don't
            //  send too many requests
            // TODO: Don't load the new view yet if the status code returned from the URL is a 404;
            //  Instead after the delay, notify the user with
            //  "Is that URL correct?  It returns a '404 page not found' error."
            var thiz = this
            this.delay(function(){
                // Declare several utility functions for use further below
                function save_cgroup_and_dir(cgroup, dir){
                    // Save the dir so if the URL has changed in the browser, it gets
                    //  updated in the db too
                    var iterations = 0
                    // Note this is a recursive function!
                    // TODO: Consider refactoring this into a separate function
                    function save_dir(cgroup, dir){
                        iterations++;
                        // Make this function wait until this rev is not being saved anymore under any other event
                        if (typeof window.app.import_directory_view.rev_currently_being_saved !== 'undefined' &&
                            window.app.import_directory_view.rev_currently_being_saved === dir.get('_rev')){
                            setTimeout(function(){ save_dir(cgroup, dir) }, 1000)
                            return;
                        }
                        dir.fetch({success:function(dir, response, options){
                            var get_url_html = dir.get('get_url_html')
                            // Prevent import from running multiple times simultaneously
                            if (get_url_html != 'getting'){
                                get_url_html = 'requested'
                            }
                            // Only save this revision if it's not currently being saved already
                            if (typeof window.app.import_directory_view.rev_currently_being_saved === 'undefined' || 
                                    window.app.import_directory_view.rev_currently_being_saved !== dir.get('_rev')){
                                // console.log(iterations + ' 196 saving', dir.get('_rev'))
                                // Prevent saving the same revision twice simultaneously
                                if (typeof window.app.import_directory_view.rev_currently_being_saved === 'undefined'){
                                    window.app.import_directory_view.rev_currently_being_saved = dir.get('_rev')
                                }
                                console.log(new Date().getTime() + "\t saving dir 148")
                                dir.save({
                                        _id:dir.get('_id'),
                                        _rev:dir.get('_rev'),
                                        url:$('#url').val(),
                                        get_url_html:get_url_html
                                    },
                                    {
                                        success:function(){
                                            // Report that it's OK for other calls to save_dir to run
                                            delete window.app.import_directory_view.rev_currently_being_saved
                                            // Append dir to CGroup
                                            cgroup.get('directories').add([{_id:dir.get('_id')}])
                                            // Save cgroup to db
                                            // TODO: Does the relation appear on the dir in the db also?
                                            // This will trigger the Node changes listener's response
                                            cgroup.save({_id:cgroup.get('_id'),_rev:cgroup.get('_rev')},{success:function(){
                                                // Render DirTypeView
                                                $('#steps').hide()
                                                thiz.dir_type_view  = new DirTypeView({el: '#steps'})
                                                thiz.dir_type_view.render()
                                                $('#steps').fadeIn(2000)
                                            }})
                                        },
                                        error:function(model, xhr, options){
                                            console.error('We got the 196 error '+ iterations)
                                            save_dir(cgroup, dir)
                                        }
                                    }
                                )
                            }
                        }})
                    }
                    save_dir(cgroup, dir)
                }
                function get_cgroup(dir){
                    // Make the dir available globally so it can be reused if the user causes
                    //  this function to be invoked again
                    // Reset status flag so the status messages will display
                    dir.set('get_state_url_html', '')
                    var cgroup_name = $('#cgroup_name').val()
                    var abbr = $('#abbreviation').val()
                    // Don't do anything if the CGroup info isn't entered yet
                    if (cgroup_name !== '' && abbr !== ''){
                        // Check if cgroup already exists in db
                        // TODO: Consider whether this pattern can be refactored into a function,
                        //  because it seems we need to use it regularly.
                        //  - I put it into model.get_or_create_one()
                        // TODO: But in this case, the callback takes two arguments.  How can
                        //  we handle different numbers of callback arguments?
                        // https://blueprints.launchpad.net/reformedchurcheslocator/+spec/make-getorcreateone-handle-multiple-callback-args
                        model.get_one(model.CGroupsByAbbrOrName,
                            [cgroup_name,abbr],
                            {success:function(cgroup){
                                if (typeof(cgroup) === 'undefined'){
                                    // The cgroup didn't exist in the db, so create it
                                    // Create CGroup
                                    model.create_one(model.CGroups,
                                        {
                                            name:cgroup_name,
                                            abbreviation:abbr
                                        },
                                        {success:function(cgroup){
                                            save_cgroup_and_dir(cgroup, dir)
                                        }}
                                    )
                                }else{
                                    // The cgroup did exist in the db, so use it
                                    save_cgroup_and_dir(cgroup, dir)
                                }
                            }}
                        )
                    }
                }
                
                // --------- Main code section begins here ----------
                
                // If we have not already created a directory on this page, create it; else get the existing directory
                if (typeof(window.app.dir) === 'undefined'){
                    // The dir hasn't been created in the browser yet
                    // If the cgroup's associated directory exists in the db, get it
                    var page_url = $('#url').val()
                    model.get_one(model.DirectoriesByURL, [page_url], {success:function(dir){
                        // If it does not exist in the db, then create it
                        if (typeof(dir) === 'undefined'){
                            // TODO: Don't create the dir if the URL is not valid.
                            //  Maybe mark the dir's URL as invalid in the node.js script (by
                            //  checking for a 404 response), and/or
                            //  just delete the dir from node.js in an asynchronous cleanup task.
                            // TODO: Provide a list of similar URLs in an autocompleter
                            // https://blueprints.launchpad.net/reformedchurcheslocator/+spec/directoryimporter-url-autocompleter
                            console.log(new Date().getTime() + "\t saving dir 239")
                            // We wait until later to set get_url_html = 'requested', so as not 
                            //  to fire that request event twice
                            model.create_one(model.Directories,
                                             {
                                                 url:page_url
                                             },
                                             {success:function(dir){
                                                 // TODO: If the other form fields are empty,
                                                 //     auto-populate them with info from this
                                                 //     directory's cgroup to help the user
                                                 // TODO: Maybe only display those fields after
                                                 //     the URL is filled in
                                                 //     https://blueprints.launchpad.net/reformedchurcheslocator/+spec/display-cgroup-name-and-abbr-fields
                                                 window.app.dir = dir
                                                 get_cgroup(dir)
                                             },error:function(){
                                                console.error('Could not create_one')
                                             }}
                            )
                        }else{
                            // It exists in the db, so use the existing dir
                            window.app.dir = dir
                            get_cgroup(dir)
                        }
                    },error:function(){
                        console.error('Could not get_one')
                    }})
                }else{
                    // It already exists in the browser, so we're editing an already-created dir
                    get_cgroup(window.app.dir)
                }
                
                // TODO: Is this code needed anymore?
                // https://blueprints.launchpad.net/reformedchurcheslocator/+spec/remove-cgroup-by-abbreviation-code
                //                var cgroup = ''
                //                // Query database by cgroup.abbreviation
                //                // TODO: Turn this into a view in model.cgroup
                //                // TODO: Run this when the abbreviation changes, rather than when the URL changes
                //                //console.log(db)
                //                db.view('rcl/cgroup-by-abbreviation', {
                //                    keys:[$('#abbreviation').val()],
                //                    include_docs:true,
                //                    success:function(data){
                //                        if (data.rows.length==1){
                //                            // Get this cgroup from the db
                //                            var cgroup = data.rows[0].doc
                //                            // Populate page with this cgroup's data
                //                            $('#cgroup_name').val(cgroup.name)
                //                            $('#abbreviation').val(cgroup.abbreviation);
                //                            create_dir(cgroup)
                //                        }else if (data.rows.length > 1){
                //                            // Report error
                //                            console.log("Error:  More than one copy of this cgroup's settings are found in the database.")
                //                        }else if (data.rows.length==0){
                //                            // Otherwise, create that cgroup
                //                            var cgroup = {
                //                                          type:   'cgroup',
                //                                          name:   $('#cgroup_name').val(),
                //                                          abbreviation:   $('#abbreviation').val()
                //                            }
                //                            db.saveDoc(cgroup,{
                //                                success:function(data){
                //                                    cgroup.id = data._id
                //                                    create_dir(cgroup)
                //                                }
                //                            })
                //                        }
                //                    }
                //                })
            }, 3000)
        },
        // TODO: Consider moving these into a library
        uses_batch_geo:function(html){
            return ( html.indexOf('https://batchgeo.com/map/') !== -1 )
        },
        process_batch_geo:function(html){
            // Get the batchgeo map URL out of the HTML
            var map_url = html.match(/(https:\/\/batchgeo.com\/map\/.+?)['"]{1}/i)[1]
            // Get the batchgeo JSON URL out of the map's HTML
            console.log(new Date().getTime() + '\tb: ' + map_url)
            window.app.dir.set('pagetype', 'batchgeo')
            window.app.dir.set('batchgeo_map_url', map_url)
            window.app.dir.set('get_batchgeo_map_html', 'requested')
            window.app.dir.save()
        },
        get_batchgeo_json:function(){
            window.app.dir.fetch({success:function(){
                window.app.dir.unset('get_batchgeo_map_html')
                var html = window.app.dir.get('batchgeo_map_html')
                // console.log(html)
                var json_url = html.match(/(https:\/\/.+?.cloudfront.net\/map\/json\/.+?)['"]{1}/i)[1]
                console.log(new Date().getTime() + '\tb: get_json for ' + json_url)
                // TODO: Request that the node script get this URL's contents
                window.app.dir.set('json_url', json_url)
                window.app.dir.set('get_json', 'requested')
                window.app.dir.save()
             }})
         },
         batchgeo_parse_json:function(){
            window.app.dir.unset('get_json')
            // The PCA has a KML file at http://batchgeo.com/map/kml/c78fa06a3fbdf2642daae48ca62bbb82
            //  Some (all?) data is also in JSON at http://static.batchgeo.com/map/json/c78fa06a3fbdf2642daae48ca62bbb82/1357687276
            //  The PCA directory's main HTML URL is http://www.pcaac.org/church-search/
            //  After trimming off the non-JSON, the cong details are in the obj.mapRS array
            //  You can pretty-print it at http://www.cerny-online.com/cerny.js/demos/json-pretty-printing
            //  Its format is as follows:
            //  per = {mapRS:[{
             // "accuracy":"ROOFTOP",
             // "postal":"30097", // mailing_zip?
             // "a":"9500 Medlock Bridge Road", // address
             // "c":"Johns Creek", // city
             // "s":"GA", // state
             // "z":"30097", // meeting_zip?
             // "t":"Perimeter Church", // name
             // "u":"www.Perimeter.org", // url
             // "i":"", // ?
             // "g":" ", // ?
             // "e":"Perimeter@Perimeter.org", // email
             // "lt":34.013179067701, // lat
             // "ln":-84.191637606647, // lng
             // "d":"<div><span class=\"l\">Church Phone:<\/span>&nbsp;678-405-2000<\/div><div><span class=\"l\">Pastor:<\/span>&nbsp;Rev. Randy Pope<\/div><div><span class=\"l\">Presbytery:<\/span>&nbsp;Metro Atlanta<\/div>", // phone, pastor_name, presbytery_name
             // "addr":"9500 Medlock Bridge Road Johns Creek GA 30097", // mailing_address (full, needs to be parsed)
             // "l":"9500 Medlock Bridge Road<br \/>Johns Creek, GA 30097", // mailing_address_formatted, easier to parse
             // "clr":"red"
             // }]}
             // TODO: The RPCNA's data is in a JSON file in RCL format already at http://reformedpresbyterian.org/congregations/json
             // TODO: Louis Hutmire asked to be sent an RPCNA data feed after RCL geocodes their data

            // Get the relevant JSON in a variable
            // This regex took forever
            // var json = window.app.dir.get('json').replace(/.*?"mapRS":/, '{"congs":').replace(/,"dataRS":.*/, '}')
            // So although this could be unsafe, it is expedient!
            eval(window.app.dir.get('json'))
            var congs = per.mapRS
            // Convert the JSON's fieldnames to RCL fieldnames
            var replacements = [
                {
                    old:'postal',
                    new:'mailing_zip'
                },
                {
                    old:'a',
                    new:'meeting_address1'
                },
                {
                    old:'c',
                    new:'meeting_city'
                },
                {
                    old:'s',
                    new:'meeting_state'
                },
                {
                    old:'z',
                    new:'meeting_zip'
                },
                {
                    old:'t',
                    new:'name'
                },
                {
                    old:'u',
                    new:'website'
                },
                {
                    old:'e',
                    new:'email'
                },
                {
                    old:'lt',
                    new:'lat'
                },
                {
                    old:'ln',
                    new:'lng'
                }
            ]
            // For each cong
            $.each(congs, function(index, cong){
                // For each key name
                $.each(replacements,function(index, repl){
                    // Replace each key name
                    cong[repl.new] = cong[repl.old];
                    delete cong[repl.old];
                })
                // Parse 'd' field into:
                //  phone, pastor_name, presbytery_name [, others?]
                // cong.d = <div><span class="l">Church Phone:</span>&nbsp;334-294-1226</div><div><span class="l">Pastor:</span>&nbsp;Rev. Brian DeWitt MacDonald</div><div><span class="l">Presbytery:</span>&nbsp;Southeast Alabama</div> 
                // Ignore errors if the match fails
                try { cong.phone = cong.d.match(/Church Phone:.*?&nbsp;(.*?)</)[1]} catch(e){}
                try { cong.pastor_name = cong.d.match(/Pastor:.*?&nbsp;Rev. (.*?)</)[1] } catch(e){}
                try { cong.presbytery_name = cong.d.match(/Presbytery:.*?&nbsp;(.*?)</)[1] } catch(e){}
                // Parse 'l' field into:
                //  mailing_address1, mailing_city, mailing_state, mailing_zip
                // cong.l = 6600 Terry Road<br />Terry, MS 39170
                // But note there are many other formats, particularly outside the US
                // TODO: compact this into a recursive function that iterates through a list of regexes to try for
                //  each field
                try{
                    cong.mailing_address1 = cong.l.match(/^(.*?)<br/)[1]
                    try{
                        cong.mailing_city = cong.l.match(/<br \/>(.*?),/)[1]
                    }catch(e){
                        try{
                            cong.mailing_city = cong.l.match(/<br \/>(.*?) [0-9]+/)[1]
                        }catch(e){
                            try{
                                cong.mailing_city = cong.l.match(/<br \/>[0-9]+ (.*?)/)[1]
                            }catch(e){
                                try{
                                    cong.mailing_city = cong.l.match(/<br \/>(.*?)/)[1]
                                }catch(e){
                                    console.log(cong.l)
                                }
                            }
                        }
                    }
                    try{
                        cong.mailing_state = cong.l.match(/<br \/>.*?, (.*?) /)[1]
                    }catch(e){
                        // The only ones missed here are not states, but cities, so this is commented out
                        // console.log(cong.l)
                    }
                    try{
                        cong.mailing_zip = cong.l.match(/<br \/>.*?, .*? (.*)$/)[1]
                    }catch(e){
                        try{
                            cong.mailing_zip = cong.l.match(/<br \/>.*? ([0-9- ]+)$/)[1]
                        }catch(e){
                            try{
                                cong.mailing_zip = cong.l.match(/<br \/>([0-9- ]+) .*/)[1]
                            }catch(e){
                                try{
                                    cong.mailing_zip = cong.l.match(/.*?[0-9]+?<br/)[1]
                                }catch(e){
                                    // The rest just don't have a zip, so this is commented out
                                    // console.log(cong.l)
                                }
                            }
                        }
                    }
                }catch(e){
                    // If this outputs data, create a new regex to fix the errors
                    console.log(cong.l)
                }
                // Convert geocode to geocouch format
                cong.loc = [cong.lat, cong.lng]
                // TODO: Set each model's cgroup_id.  What key name does backbone-relational use for the cgroup_id?
                cong.cgroups = []
                cong.collection = 'cong'
                congs[index] = cong
            })
            // Write the JSON to the database
            // It is easiest to bulk-save using jquery.couch.js rather than Backbone
            config.db.bulkSave({"docs":congs},{success:function(){
                console.log(new Date().getTime() + '\tb: All congs are saved!')
            }})
        }
    });
});
