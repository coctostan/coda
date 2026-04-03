Execute a Cypher subset query against the graph.
Examples:
MATCH (a {name: "hello"}) RETURN a
MATCH (a {name: "foo"})-[r:calls]->(b) RETURN a, r, b LIMIT 5
MATCH (n) WHERE n.name = "GraphStore" RETURN n.name
MATCH (n) WHERE n.name CONTAINS "Graph" RETURN n.name
MATCH (n {kind: "function"}) RETURN n LIMIT 10