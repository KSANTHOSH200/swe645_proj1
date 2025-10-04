// File: Jenkinsfile
// Description: CI/CD with dynamic K8s discovery (context/namespace/deployment/container) from kubeconfig

pipeline {
  agent any
  options { timestamps() }

  environment {
    IMAGE_NAME = 'ksanthosh200/swe645-site'
    IMAGE_TAG  = '1.0'   // fixed tag as requested
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Docker Build & Push') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-credentials',   // Jenkins credential ID
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            set -euo pipefail

            docker logout || true
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
            docker tag  ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest

            docker push ${IMAGE_NAME}:${IMAGE_TAG}
            docker push ${IMAGE_NAME}:latest
          '''
        }
      }
    }

    stage('Discover K8s from kubeconfig') {
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
          script {
            // Export kubeconfig for subsequent kubectl calls in this stage
            sh '''
              set -euo pipefail
              export KUBECONFIG="$KUBECONFIG_FILE"

              echo "Current context:"
              kubectl config current-context || true

              # Read namespace from kubeconfig (minified view). May be empty.
              NS="$(kubectl config view --minify --output 'jsonpath={..namespace}' || true)"
              if [ -z "$NS" ]; then
                NS=default
              fi
              echo "Using namespace: $NS"

              # Discover first deployment in the namespace
              DEPLOY="$(kubectl get deploy -n "$NS" -o jsonpath='{.items[0].metadata.name}')"
              if [ -z "$DEPLOY" ]; then
                echo "ERROR: No deployments found in namespace '$NS'." >&2
                exit 2
              fi
              echo "Found deployment: $DEPLOY"

              # Discover first container name in that deployment
              CONTAINER="$(kubectl get deploy "$DEPLOY" -n "$NS" -o jsonpath='{.spec.template.spec.containers[0].name}')"
              if [ -z "$CONTAINER" ]; then
                echo "ERROR: Could not determine container name for deployment '$DEPLOY' in namespace '$NS'." >&2
                exit 3
              fi
              echo "Found container: $CONTAINER"

              # Persist discoveries to a file to source later stages
              cat > .k8s_env <<EOF
export KUBECONFIG="${KUBECONFIG_FILE}"
export K8S_NAMESPACE="${NS}"
export K8S_DEPLOYMENT="${DEPLOY}"
export K8S_CONTAINER="${CONTAINER}"
EOF
            '''

            // Load the discovered vars into the Jenkins environment for later usage
            def envVars = sh(returnStdout: true, script: "cat .k8s_env").trim()
            for (line in envVars.split("\\r?\\n")) {
              def parts = line.replace("export ","").split("=", 2)
              if (parts.size() == 2) {
                def key = parts[0].trim()
                def val = parts[1].trim().replaceAll('^\"|\"$', '')
                env."${key}" = val
              }
            }

            echo "K8s target -> namespace=${env.K8S_NAMESPACE}, deployment=${env.K8S_DEPLOYMENT}, container=${env.K8S_CONTAINER}"
          }
        }
      }
    }

    stage('Kubernetes Deploy') {
      steps {
        // Use the discovered values saved in env.* by the previous stage
        sh '''
          set -euo pipefail
          . ./.k8s_env

          echo "Deploying ${IMAGE_NAME}:${IMAGE_TAG} to ${K8S_NAMESPACE}/${K8S_DEPLOYMENT} (container: ${K8S_CONTAINER})"

          kubectl set image deployment/${K8S_DEPLOYMENT} ${K8S_CONTAINER}=${IMAGE_NAME}:${IMAGE_TAG} -n ${K8S_NAMESPACE}
          kubectl rollout status deployment/${K8S_DEPLOYMENT} -n ${K8S_NAMESPACE} --timeout=180s
          kubectl get pods -n ${K8S_NAMESPACE} -o wide
        '''
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
      echo 'Pipeline finished.'
    }
    success {
      echo "✅ Deployment Successful: ${IMAGE_NAME}:${IMAGE_TAG}"
    }
    failure {
      echo '❌ Deployment Failed. See logs above.'
    }
  }
}
