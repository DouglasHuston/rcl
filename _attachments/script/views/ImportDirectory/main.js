define(
   [
    '../../config',
    '../../model',
    '../../lib/mustache',
    './ConfirmCongIDView'
    ],
    function(config, model, Mustache, ConfirmCongIDView){

        var ImportDirectoryView = Backbone.View.extend({
            initialize : function(){
                db = config.db
                wgxpath.install()
                
                // Make it easy to reference this object in event handlers
                _.bindAll(this)
                

                // Set up browser changes listener to watch for and handle Node changes
                //  listener's response
                var changes = db.changes();
                var thiz = this
                // TODO: convert to this.watching_import_directory_view_changes
                if (typeof watching_import_directory_view_changes == 'undefined'){
                    changes.onChange(function(change){
                        var change_id = change.results[0].id
                        var rev = change.results[0].changes[0].rev
                        // Determine if the changed document is the dir we are editing
                        if (typeof dir != 'undefined' && change_id == dir.get('_id')){
                            // Fetch document's new contents from db
                            // TODO: Why doesn't backbone-couchdb automatically update the
                            //  model object for me when the associated doc changes in the db?
                            dir.fetch({success:function(model,response){
                                
                                // ----------------------------------------------------------
                                // These are the main cases - different types of changes that
                                //  need to be handled
                                
                                // Display directory's first page of content
                                if (dir.get('url_html') &&
                                        dir.get('get_url_html') == 'gotten'){
                                    var html = dir.get('url_html')
                                    // In the controller & output to form, handle whether this is an RSS feed or an HTML page
                                    // Determine whether url_html contains HTML or RSS
                                    if (html.indexOf("</html>") > -1){
                                        $("#directory_type").show(1000);
                                        // This event handler needs to be attached here because otherwise it is
                                        //  unavailable in the tests
                                        $('#directory_type input').click(thiz.show_directory)
                                        $("#rss_feed").hide(1000);
                                        dir.set('pagetype', 'html')
                                    }
                                    else if (html.indexOf("</rss>") > -1){
                                        // TODO: Display the right form controls for an RSS page
                                        $("#directory_type").hide(1000);
                                        $("#rss_feed").show(1000);
                                        dir.set('pagetype', 'rss')
                                    }
                                    else { // We got an error code
                                        // TODO: Finesse this condition to be consistent
                                        //  with the nested conditions above
                                        // Hide the form controls.
                                        elem.trigger('hide_subform');
                                    }
                                    dir.set('get_url_html', '')
                                    // TODO: Is this the right place to save the dir?
                                    //    https://blueprints.launchpad.net/reformedchurcheslocator/+spec/decide-whether-to-save-dir
                                    //dir.save({_id:dir.get('_id')})
                                }
                                
                                // Display state details page's content
                                if (dir.get('state_url_html')){
                                    console.log('---------------')
                                    console.log('get_state_url_html: ' + dir.get('get_state_url_html'))
                                    if (dir.get('get_state_url_html') == 'getting'){
                                        console.log('gotten: ' + dir.get('state_urls_gotten'))
                                        $('#cong_details_url #status').html('Getting state page data for # ' +
                                             dir.get('state_urls_gotten') + ' of ' +
                                             dir.get('state_page_values').length + ' state pages (this may take a while)...')
                                        if (dir.get('state_url_html').length >0 &&
                                                typeof displayed_state_page == 'undefined'){
                                            // Display the contents of the state page
                                            // TODO: This displays only one state's page.  Create a way
                                            //  to iterate through the other states' pages to test them
                                            //  to see if the regex works on them, after getting
                                            //  a regex that works from this first state page.
                                            try{
                                                // It's best to catch and ignore errors
                                                //  generated from the web-scraped HTML
                                                var index = 0
                                                var new_html_set = thiz.rewrite_urls(dir.get('state_url'), dir.get('state_url_html'), index)
                                                $('#cong_details_url_selector').html(new_html_set[index])
                                                $('#cong_details_url_selector').show(1000)
                                            }catch(err){
                                                console.log("The remote site's code output the following error: " + err)
                                            }
                                            displayed_state_page = true
                                            // Handle the user's click on the congregation
                                            //  details link
                                            $('#cong_details_url_selector a').click(function(e){
                                                e.preventDefault()
                                                window.app.import_directory_view.show_select_cong_details(e);
                                            });
                                        }
                                    }
                                    if (dir.get('get_state_url_html') == 'gotten'){
                                        // Notify user
                                        $('#cong_details_url #status').html('Downloaded data for all states!')
                                        $('#cong_details_url #status').delay(5000).fadeOut(1000).slideUp(1000)
                                    }
                                }
                                
                                // ----------------------------------------------------------

                            }})
                        }
                    })
                    watching_import_directory_view_changes = true;
                }
            },
            render: function(){
                // TODO: Consider using assign() as described here:  http://ianstormtaylor.com/rendering-views-in-backbonejs-isnt-always-simple/
                config.render_to_id(this, "#import_directory_template")
            },
            events: {
                'keyup #url':"get_church_dir_from_url"
            },
            rewrite_urls:function(page_url, page_html_set, index){
                // Prepend the root URL to every partial URL in this HTML
                function replacer(match, p1, p2, offset, string){
                    var output;
                    // Absolute, partial URL:  /locator.html
                    if (p2.indexOf('/') === 0){
                        output = a.origin + p2
                    }
                    // Absolute, full URL:  http://opc.org/locator.html
                    else if (p2.indexOf('http') === 0){
                        output = p2
                    }
                    // Relative, partial URL:  locator.html
                    else{
                        output = root_url + '/' + p2
                    }
                    // Include the href='' or src='' portion in what goes back into the HTML
                    return match.replace(p2, output)
                }
                // Get root URL
                var a = document.createElement('a')
                a.href = page_url
                var base = a.origin + a.pathname
                var root_url = base.slice(0,base.lastIndexOf('/'))
                if (typeof page_html_set[index] == 'string'){
                    // Find the URLs to replace
                    var regex = /(href|src)\s*=\s*['"]{1}(.*?)['"]{1}/g
                    // In every page
                    for (var i=0; i<page_html_set.length; i++){
                        // Replace the URLs
                        page_html_set[i] = page_html_set[i].replace(regex, replacer)
                    }
                    return page_html_set
                }else{
                    console.error('the page_url was not defined, but should have been')
                }
            },
            get_church_dir_from_url:function(){

                // Delay this to run after typing has stopped for 2 seconds, so we don't
                //  send too many requests
                // TODO: Don't fire on every key event, but only once after delay.
                //  The way to do this is not via setTimeout, but probably something
                //  like a while loop
                //setTimeout(function(){
                var thiz = this
    
                // Declare several utility functions for use further below
                function save_cgroup_and_dir(cgroup, dir){
                    // Save the dir so if the URL has changed in the browser, it gets
                    //  updated in the db too
                    var iterations = 0
                    // Note this is a recursive function!
                    function save_dir(cgroup, dir){
                        iterations++;
                        dir.fetch({success:function(dir, response, options){
                            var get_url_html = dir.get('get_url_html')
                            // Prevent import from running multiple times simultaneously
                            if (get_url_html != 'getting'){
                                get_url_html = 'requested'
                            }
                            // TODO: This generates a 409 conflict
                            console.log(iterations, dir.get('_rev'))
                            if (typeof thiz.rev_currently_being_saved === 'undefined'){
                                thiz.rev_currently_being_saved = dir.get('_rev')
                                console.log("Don't save rev " + thiz.rev_currently_being_saved + ' twice simultaneously')
                            }
                            if (typeof thiz.rev_currently_being_saved !== 'undefined' && 
                                    thiz.rev_currently_being_saved !== dir.get('_rev')){
                                dir.save({
                                            _id:dir.get('_id'),
                                            _rev:dir.get('_rev'),
                                            url:$('#url').val(),
                                            get_url_html:get_url_html
                                        },
                                        {
                                            success:function(){
                                                // Report that it's OK for other calls to save_dir to run
                                                delete thiz.rev_currently_being_saved
                                                // Append dir to CGroup
                                                cgroup.get('directories').add([{_id:dir.get('_id')}])
                                                // Save cgroup to db
                                                // TODO: Does the relation appear on the dir in the db also?
                                                cgroup.save({_id:cgroup.get('_id'),_rev:cgroup.get('_rev')})
                                                // This will trigger the Node changes listener's response
                                            },
                                            error:function(model, xhr, options){
                                                console.error('We got the 181 error '+ iterations)
                                                save_dir(cgroup, dir)
                                            }
                                        })
                                }
                            
                            }
                        })
                    }
                    save_dir(cgroup, dir)
                }
                
                function get_cgroup(dir){
                    // Make the dir available globally so it can be reused if the user causes
                    //  this function to be invoked again
                    window.dir = dir
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
                              }})
                    }
                }
                
                // --------- Main code section begins here ----------
                
                // If we have already created a directory on this page, get it
                if (typeof(dir) === 'undefined'){
                    // The dir hasn't been created in the browser yet
                    // If the cgroup's associated directory exists in the db, get it
                    model.get_one(model.DirectoriesByURL, [$('#url').val()], {success:function(dir){
                        // If it does not exist in the db, then create it
                        if (typeof(dir) === 'undefined'){
                            // TODO: Don't create the dir if the URL is not valid.
                            //  Maybe mark the dir's URL as invalid in the node.js script (by
                            //  checking for a 404 response), and/or
                            //  just delete the dir from node.js in an asynchronous cleanup task.
                            // TODO: Provide a list of similar URLs in an autocompleter
                            // https://blueprints.launchpad.net/reformedchurcheslocator/+spec/directoryimporter-url-autocompleter
                            model.create_one(model.Directories,
                                             {
                                                 url:$('#url').val(),
                                                 get_url_html:'requested'
                                             },
                                             {success:function(dir){
                                                 // TODO: If the other form fields are empty,
                                                 //     auto-populate them with info from this
                                                 //     directory's cgroup to help the user
                                                 // TODO: Maybe only display those fields after
                                                 //     the URL is filled in
                                                 //     https://blueprints.launchpad.net/reformedchurcheslocator/+spec/display-cgroup-name-and-abbr-fields
                                                 get_cgroup(dir)
                                             }}
                            )
                        }else{
                            // It exists in the db, so use the existing dir
                            get_cgroup(dir)
                        }
                    }})
                }else{
                    // It already exists in the browser, so we're editing an already-created dir
                    get_cgroup(dir)
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
            },
            hide_dir_and_display_type:function(){
                $('#dir_and_display_type').hide(1000)
            },
            hide_subform:function(){
                $("#directory_type, #rss_feed, #cong_details, #state_page, #church_directory_page").hide(1000);
            },
            show_directory:function(){
                var type = $('input:radio[name=type]:checked').val();
                // TODO: The PCA has a KML file at http://batchgeo.com/map/kml/c78fa06a3fbdf2642daae48ca62bbb82
                //  Some (all?) data is also in JSON at http://static.batchgeo.com/map/json/c78fa06a3fbdf2642daae48ca62bbb82/1357687276
                //  After trimming off the non-JSON, the cong details are in the obj.mapRS array
                //  You can pretty-print it at http://www.cerny-online.com/cerny.js/demos/json-pretty-printing
                if (type=='one page'){
                    // Show the one page divs
                    $("#state_page").hide(1000);
                    // TODO: If "One Page" is selected, then show page containing list of all congs.
                    // https://blueprints.launchpad.net/reformedchurcheslocator/+spec/show-one-page-directory
                    // TODO: For some reason, the global dir object is not avaiable in this scope
                    // https://blueprints.launchpad.net/reformedchurcheslocator/+spec/get-global-dir-object-in-scope
                    dir.set('display_type', type)
                }
                //  If "One state per page" is selected, then drop down box showing state options.
                if (type=='one state per page'){
                    // Show the state page divs
                    $("#state_page").show(1000);
                    dir.set('display_type', type)
                    // Populate state_drop_down_selector div with contents of church directory page,
                    //  maybe in a scrollable div
                    var new_html_set = this.rewrite_urls(dir.get('url'), [dir.get('url_html')], 0)
                    $('#state_drop_down_selector').html(new_html_set[0]);
                    // We bind the event here because the select element didn't exist at this Backbone view's
                    //  initialization
                    $('#state_drop_down_selector select')
                        .click({this_ob:this},function(event){ event.data.this_ob.show_state_page(event)})
                }
                this.hide_dir_and_display_type()
            },
            show_state_page:function(event){
                // Get the list of state page URLS out of its option values
                // That is a bit challenging, because the format may be different for each directory.
                // So, I think we need a regular expression editor here.
                var el = $(event.target),
                    options = $(el).children(),
                    values = [];
                
                // Get the select box the user clicked, and record its xpath below so it can be found later.
                // Note this xpath is recorded relative to the container of the directory website's body element
                var xpath = config.getXPath($(el)[0]).replace(config.getXPath($('#state_page')[0]),'')
                
                // Disable the select box immediately after the user clicks on it, so they can't
                //  click on one of its options and fire a page load event.
                $(event.target).prop('disabled',true)
                event.preventDefault()
                var state_page_values = []
                for (var i=0; i<options.length; i++){
                    var val = $(options[i]).val()
                    if (val !== '' && val !== null && val !== 'null'){
                        state_page_values.push(val);
                    }
                }
                // Hide divs we don't need now
                $("#state_page, #url_and_display_type, #directory_type, #cong_details_fields_selector").hide(1000);
                // Get cong data from a URL like this:  http://opc.org/locator.html?state=WA&search_go=Y
                // TODO: Record whether to send a GET or POST
                // Display these bits of data to the user so they can edit them.
                // Show confirmation div
                $('#cong_details_url').show(1000)
                var form = el.closest('form')
                // Handle cases where there is or is not a final slash in base_url, or
                //  an initial slash in form.attr('action').
                var base_url = dir.get('url').replace(/\/+$/,'')
                var state_url = ''
                if (form.attr('action').indexOf('/') === 0){
                    // action is a partial absolute URL, so attach it to the domain name
                    var state_url_parts = base_url.split('/').slice(0,3)
                    state_url_parts.push(form.attr('action').replace(/^\//,''))
                    state_url = state_url_parts.join('/')
                }else if (form.attr('action').indexOf('http') === 0){
                    // action is a complete absolute URL
                    state_url = form.attr('action')
                }else{
                    // action is a relative URL
                    var base_url_shortened = base_url.slice(0,base_url.lastIndexOf('/'))
                    state_url = base_url_shortened + '/' + form.attr('action')
                }
                state_url += '?' + el.attr('name') + '=' + '{state_name}'
                // Append other form inputs
                $.each($(form).find('input'),function(index,element){
                    var input = $(element)
                    state_url += '&' + input.attr('name') + '=' + input.val()
                })
                var it = 0
                // Note this is a recursive function!  It tries to save until it succeeds.
                function save_dir(dir){
                    it++;
                    dir.fetch({success:function(model, response, options){
                        // console.log(model.get("_rev"))
                        // console.log(dir.get("_rev"))
                        // console.log(response)
                        // TODO: There is a document update conflict here.  The local and remote copies appear to
                        //  have the same _rev from here.  But in the DB, the _rev is 2 beyond that detected
                        //  here.
                        var get_state_url_html = dir.get('get_state_url_html')
                        // Prevent import from running multiple times simultaneously
                        // TODO: Start here.  This seems to prevent the import from running at all.
                        console.log('get_state_url_html: ' + get_state_url_html)
                        if (get_state_url_html != 'getting'){
                            get_state_url_html = 'requested'
                        }
                        console.log('get_state_url_html: ' + get_state_url_html)
                        dir.save({
                            state_url:state_url,
                            get_state_url_html:get_state_url_html,
                            state_url_html:'',
                            state_url_method:form.attr('method'),
                            select_element_xpath:xpath,
                            state_page_values:state_page_values
                            },
                            {
                                success:function(){
                                    // Notify the user that we are downloading the requested data
                                    $('#cong_details_url #status').html('Getting state page data for # 1 of ' +
                                         state_page_values.length + ' state pages (this may take a while)...')
                                    // Show state details page div
                                    $("#cong_details_url").fadeIn(1000);
                                },
                                error:function(model, xhr, options){
                                    console.error('we got an error')
                                    save_dir(dir)
                                }
                            }
                        )
                    }})
                }
                save_dir(dir)
            },
            show_select_cong_details:function(event){
                // Hide step 4's header, letting the status message continue to display
                $('#cong_details_url>h2').hide(1000)
                // Prevent the link from making the browser navigate away from this page
                event.preventDefault()
                // Display step 4.5 in a child view
                //this.confirm_cong_id_view = new ConfirmCongIDView({el:'#ConfirmID'})
                this.confirm_cong_id_view = new ConfirmCongIDView({el:'#cong_details_url_selector'})
            }
        })
        return ImportDirectoryView

});