File Caching Server App.md

Create the following app:

File Caching Server: A caching server that has main two API endpoints.
1. GetURL with a URL parameter.  If the response to the URL is in the cache, provide it.  Otherwise, retrieve the response from the internet, store the URL/response pair in the cache, and return the response
2. Contents with no parameters.  Return a list of URLs that are cached within the server, with the byte count of each response

The app should be easily run in a docker container.

Choose a default listening port that isn't widely known to be in use by other servers

Node or python is acceptable.  Other suggestions welcome for tech stack.

