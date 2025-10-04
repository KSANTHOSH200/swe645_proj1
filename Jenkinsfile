// File: Jenkinsfile
// Description: Secure CI/CD with Docker build/push and Kubernetes deploy using masked credentials

pipeline {
  agent any

  options {
    timestamps()
  }

  // Poll Git every minute (optional – remove if using webhooks)
  triggers {
    pollSCM('* * * * *')
  }

  environment {
    // Image coordinates (edit repo to yours)
    DOCKER_IMAGE_REPO = 'ksanthosh200/swe645-site'
    // Timestamped tag like 20251003T134501
    BUILD_TIMESTAMP   = "${new Date().format('yyyyMMdd\'T\'HHmmss')}"
    K8S_NAMESPACE     = 'default'
    K8S_DEPLOYMENT    = 'deployment'     // your Deployment name
    K8S_CONTAINER     = 'container-0'    // your container name inside the Deployment
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        sh 'echo "Building tag: ${BUILD_TIMESTAMP}"'
      }
    }

    stage('Docker Login, Build & Tag (secure)') {
      steps {
        // Inject Docker Hub username/password as masked env vars
        withCredentials([usernamePassword(
          credentialsId: 'docker-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            set -euo pipefail

            # Login securely (password masked in logs)
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            # Build image and tag with timestamp + latest
            docker build -t ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} .
            docker tag  ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} ${DOCKER_IMAGE_REPO}:latest

            # Show resulting images (no secrets)
            docker image ls ${DOCKER_IMAGE_REPO}
          '''
        }
      }
    }

    stage('Push to Docker Hub (secure)') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            set -euo pipefail
            # Ensure we are logged in (token is short-lived across stages on some setups)
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            docker push ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}
            docker push ${DOCKER_IMAGE_REPO}:latest
          '''
        }
      }
    }

    stage('Deploy to Kubernetes (secure kubeconfig)') {
      steps {
        // Provide kubeconfig as a temp file path env var (masked)
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
          sh '''
            set -euo pipefail
            export KUBECONFIG="$KUBECONFIG_FILE"

            # Update image on the deployment’s container
            kubectl set image deployment/${K8S_DEPLOYMENT} ${K8S_CONTAINER}=${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} -n ${K8S_NAMESPACE}

            # Wait for rollout to complete
            kubectl rollout status deployment/${K8S_DEPLOYMENT} -n ${K8S_NAMESPACE} --timeout=180s

            # Show pods for verification (no secrets)
            kubectl get pods -n ${K8S_NAMESPACE} -o wide
          '''
        }
      }
    }
  }

  post {
    always {
      // Best-effort logout to reduce secret exposure surface
      sh '''
        docker logout || true
      '''
      echo 'Pipeline finished.'
    }
    success {
      echo "✅ Deployment Successful: ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}"
    }
    failure {
      echo "❌ Deployment Failed. Check stage logs above."
    }
  }
}
