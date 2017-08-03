import groovyx.net.http.HTTPBuilder
import groovyx.net.http.RESTClient
import groovyx.net.http.ContentType
import static groovyx.net.http.Method.*
import com.amazonaws.services.lambda.runtime.Context


class Locations {

  public static void main(String[] args) {
      println "authkey: " + getvehicle()
    }

    def static getLocations(Map<String,Object> data, Context context) {
      // https://api.networkfleet.com/locations/vehicle/376509/track
      def http = new HTTPBuilder("https://api.networkfleet.com/")
      def path = "/locations"
      // def query = ""
      def method = GET
      def result
      def authKey = getAuthKey()
      try {
      // perform a ${method} request, expecting TEXT response
          http.request(method, ContentType.JSON) {
              uri.path = path
              // uri.query = query
              headers.'Content-Type' = 'application/json'
              headers.'Authorization' = 'Bearer ' + authKey.access_token
              headers.'Accept' = 'application/vnd.networkfleet.api-v1+json'

              // response handler for a success response code
              response.success = { resp, json ->
                  result = json
              }
          }

        }catch(e) {
          println "error: " + e
        }
    }


  def static getAuthKey() {
      def http = new HTTPBuilder("https://auth.networkfleet.com/")
      def path = "/token"
      // def query = ""
      def method = POST
      def result
      def username = System.getenv("username")
      def password = System.getenv("password")

      try {
      // perform a ${method} request, expecting TEXT response
          def postBody = [grant_type: 'password', username:username, password:password] // will be url-encoded

          http.request(POST) {
           uri.path = '/token'
           requestContentType = ContentType.URLENC
           body = postBody
           headers.'Content-Type' = "application/x-www-form-urlencoded"
           headers.'Authorization' = "Basic " + (username + ":" + password).bytes.encodeBase64().toString()

           response.success = { resp, data ->
                  return data
              }

              response.'400' = { resp, data ->
                println "400: " + data
              }
          }

        }catch(e) {
          println "error: " + e.properties
        }
    }
}
