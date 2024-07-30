![screencast](screen.gif)

# Gru

Gru is a simple node script that fetches pages from a URL and crawls URLs it finds in that page at random. It supports
a few options to control the behavior of the crawler.

```
--concurrency 10 (-c 10) sets the number of workers to span. Each worker will start at the same initial page
--header "user-agent: gru" (-h "user-agent: gru") sets arbitrary headers to send with the request
```

## Example usage
```
$ node index.js --concurrency 10 --header "user-agent: gru" https://www.example.com
```
