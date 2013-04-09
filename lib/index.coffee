
window.bone = {}
bone.$ = window.$
require('./history')


bone.log = true

eventSplitter = /^(\S+)\s*(.*)$/
slice = Array::slice
toString = Object::toString

setupEvent = (eventName, rootSelector, selector, action) ->

bone.view = (selector, options) ->
    view = {}
    events = options.events
    for eventSelector, functionName of events
        continue if functionName is 'events'
        do (eventSelector, functionName) ->
            match = eventSelector.match eventSplitter
            eventName = match[1]
            subSelector = match[2]
            fullSelector = selector
            fullSelector += " #{subSelector}" if subSelector?
            action = options[functionName]
            $ -> $('body').on eventName, fullSelector, (event) ->
                console.log "Interface: [#{fullSelector}:#{eventName}]", event.currentTarget if bone.log
                root = $(fullSelector).parents(selector)[0]
                action.call view, root, event

    for name, action of options
        continue if name is 'events'
        if toString.call(action) isnt '[object Function]'
            view[name] = action
            continue
        do (name, action) ->
            view[name] = (data) ->
                for element in $(selector)
                    do (element) ->
                        if bone.log
                            message = "View: [#{selector}:#{name}]"
                            console.log message, element, data
                        action.call view, element, data
    view.filter = (selector) ->
        filtered = {}
        for name, value of options
            continue if name is 'events'
            if toString.call(action) isnt '[object Function]'
                view[name] = action
                continue
            console.log('do it')
            do (name, action) ->
                filtered[name] = (data) ->
                    for element in $(selector)
                        do (element) ->
                            if bone.log
                                message = "View: [#{selector}:#{name}]"
                                console.log message, element, data
                            action.call view, element, data
        console.log(filtered)
        return filtered
    return view
            
bone.io = {}

bone.io.sources = {}

bone.io.get = (source) ->
    socket = bone.io.sources[source]
    return socket if socket?
    socket = io.connect()
    bone.io.sources[source] = socket
    return socket

bone.io.route = (sourceName, actions) ->
    source = bone.io.get(sourceName)
    for name, action of actions
        do (name, action) ->
            source.socket.on "#{sourceName}:#{name}", (data) ->
                if bone.log
                    message = "Data-In: [#{sourceName}:#{name}]"
                    console.log message, data
                action data

bone.io.configure = (source, options) ->
    name = source
    source = bone.io.sources[source] =
        socket: io.connect()
    for action in options.actions
        do (action) ->
            source[action] = (data) ->
                console.log "Data-Out: [#{name}:#{action}]", data if bone.log
                source.socket.emit "#{name}:#{action}", data

    
