// File: Jenkinsfile
// Description: CI/CD (Docker build/push with fixed tag) + K8s deploy using kubeconfig.
//              Downloads kubectl into workspace if it's not present.

pipeline {
  agent any
  options { timestamps() }

  environment {
    IMAGE_NAME = 'ksanthosh200/swe645-site'
    IMAGE_TAG  = '1.0'                 // fixed tag
    K8S_NAMESPACE  = 'default'         // only used for messages; discovery handled at runtime if needed
  }

  stages {
    stage('Checkout Code') {
      steps {
        checkout scm
        sh 'echo "Building: ${IMAGE_NAME}:${IMAGE_TAG}"'
      }
    }

    stage('Docker Build & Push (fixed tag)') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-credentials',   // Docker Hub username + RW token
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

    stage('Prepare kubectl (workspace local)') {
      steps {
        sh '''
          set -euo pipefail
          mkdir -p .bin
          if [ ! -x .bin/kubectl ]; then
            echo "kubectl not found; downloading to .bin/ ..."
            VER="$(curl -Ls https://dl.k8s.io/release/stable.txt)"
            curl -L -o .bin/kubectl "https://dl.k8s.io/release/${VER}/bin/linux/amd64/kubectl"
            chmod +x .bin/kubectl
            echo "kubectl version (client):"
            ./.bin/kubectl version --client --output=yaml || true
          else
            echo "kubectl already present at .bin/kubectl"
            ./.bin/kubectl version --client --output=yaml || true
          fi
        '''
      }
    }

    stage('Deploy to Kubernetes') {
      environment {
        // Prepend our local kubectl to PATH only for this stage
        PATH = "${env.WORKSPACE}/.bin:${env.PATH}"
      }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
          sh '''
            set -euo pipefail
            export KUBECONFIG="$KUBECONFIG_FILE"

            echo "Current kubectl client:"
            kubectl version --client=true --output=yaml || true

            echo "Current context:"
            kubectl config current-context || true

            # Optional: show namespace derived from kubeconfig (defaults to 'default' if empty)
            NS="$(kubectl config view --minify -o jsonpath='{..namespace}' || true)"
            if [ -z "$NS" ]; then NS=default; fi
            echo "Using namespace: $NS"

            # Update your existing Deployment/Container with fixed tag
            # (Change names below if your deployment or container differs)
            kubectl set image deployment/deployment container-0=${IMAGE_NAME}:${IMAGE_TAG} -n "$NS"

            kubectl rollout status deployment/deployment -n "$NS" --timeout=180s
            kubectl get pods -n "$NS" -o wide
          '''
        }
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
