// Broadcaster connects to all peers
// Naive model
function ServerClientModel () {
  var broadcaster

    // Sets the peer with the given ID as the source
  this.setBroadcaster = function setBroadcaster (id) {
    broadcaster = id
  }

    // Adds a peer to the model returns the ids of peers it should connect to
  this.addPeer = function addPeer (id) {
    if (!broadcaster) return []

    return [broadcaster]
  }

    // Removes a peer from the model, returning the ids of peers that must reconnect
  this.removePeer = function removePeer (id) {
    return []
  }
}
module.exports.ServerClientModel = ServerClientModel

// Peers connect to each other in k long, straight chains
// Use k-tree instead.
function ChainModel (k) {
  var broadcaster,
    chains

    // Create k chains
  function init () {
    chains = []
    for (var i = 0; i < k; i++) {
      chains.push([])
    }
  }
  init()

  this.getChains = function () {
    return chains
  }

    // Sets the peer with the given ID as the source
  this.setBroadcaster = function addPeer (id) {
    init()
    broadcaster = id
  }

    // Adds a peer to the model returns the ids of peers it should connect to
  this.addPeer = function addPeer (id) {
    if (!broadcaster) return []

    var min = 99999999
    var index = 0

    for (var i = 0; i < chains.length; i++) {
      if (chains[i].length < min) {
        min = chains[i].length
        index = i
      }
    }
    chains[index].push(id)
    if (min === 0) {
      return [broadcaster] // Connect directly to broadcaster
    } else {
      return [chains[index][chains[index].length - 2]] // Return last peer of shortest chain
    }
  }

    // Removes a peer from the model, returning the ids of peers that must reconnect
  this.removePeer = function removePeer (id) {
    var index

    for (var i = 0; i < chains.length; i++) {
      index = chains[i].indexOf(id)
      if (index !== -1) {
        return chains[i].splice(index, chains[i].length)
      }
    }
    return []
  }
}
module.exports.ChainModel = ChainModel

// Peers connect to each other in a k-tree with an indegree of 1 and outdegree of k
function TreeModel (k) {
  var broadcasterID
  var graph = {}

    // Setup/reset the tree
  function init () {
    graph = {}
    graph[broadcasterID] = {
      id: broadcasterID,
      children: []
    }
  }

    // Breadth-first search (returns id of closest-to-source available node)
  function BFS () {
    var queue
    var current

    queue = [broadcasterID]

    while (queue.length > 0) {
      current = graph[queue.shift()]
      if (current.children.length < k) {
        return current.id
      }

      for (var i = 0; i < current.children.length; i++) {
        queue.push(current.children[i])
      }
    }
    return broadcasterID
  }

  this.getGraph = function () {
    return graph
  }

    // Sets the peer with the given ID as the source
  this.setBroadcaster = function addPeer (id) {
    broadcasterID = id
    init()
  }

    // Adds a peer to the model returns the ids of peers it should connect to
  this.addPeer = function addPeer (id) {
    if (!broadcasterID) {
      return []
    }
    var parentID = BFS()
    graph[id] = {
      id: id,
      children: [],
      parent: parentID
    }
    graph[parentID].children.push(id)
    return [parentID]
  }

    // Removes a peer from the model, returning the ids of peers that must reconnect
  this.removePeer = function removePeer (id) {
    if (!broadcasterID) {
      return []
    }
    var result = []

    function disconnect (id) {
      while (graph[id].children[0]) {
        result.push(graph[id].children[0])
        disconnect(graph[id].children[0])
      }
      var index = graph[graph[id].parent].children.indexOf(id)
      graph[graph[id].parent].children.splice(index, 1)
      delete graph[id]
    }

    disconnect(id)
    return result
  }
}
module.exports.TreeModel = TreeModel

