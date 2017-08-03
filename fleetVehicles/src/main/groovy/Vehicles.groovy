import groovyx.net.http.HTTPBuilder
import groovyx.net.http.RESTClient
import groovyx.net.http.ContentType
import static groovyx.net.http.Method.*
import com.amazonaws.services.lambda.runtime.Context

class Vehicles {

    public static void main(String[] args) {
      println "authkey: " + getVehicles()
    }

    def static getVehicles(Map<String,Object> data, Context context) {

      def http = new HTTPBuilder("https://api.networkfleet.com/")
      def path = "/vehicles"
      def method = GET
      def result
      def authKey = getAuthKey()
      try {
      // perform a ${method} request, expecting TEXT response
          http.request(method, ContentType.JSON) {
              uri.path = path
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
          return result
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
