pipeline {
  agent any
  options { timestamps() }
  triggers { pollSCM('* * * * *') }

  environment {
    DOCKER_IMAGE_REPO = 'ksanthosh200/swe645-site'
    BUILD_TIMESTAMP   = "${new Date().format('yyyyMMdd\'T\'HHmmss')}"
    K8S_NAMESPACE     = 'default'
    K8S_DEPLOYMENT    = 'deployment'
    K8S_CONTAINER     = 'container-0'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'echo "Building tag: ${BUILD_TIMESTAMP}"'
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          set -euo pipefail
          docker build -t ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} .
          docker tag  ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} ${DOCKER_IMAGE_REPO}:latest
        '''
      }
    }

    stage('Docker Login & Push (secure)') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-credentials',   // <-- your Jenkins cred ID
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          // Use single-quoted heredoc so Groovy does NOT interpolate $DOCKER_PASS in logs
          sh <<'EOF'
set -euo pipefail
echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
docker push ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}
docker push ${DOCKER_IMAGE_REPO}:latest
EOF
        }
      }
    }

    stage('Kubernetes Deploy (secure)') {
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
          sh <<'EOF'
set -euo pipefail
export KUBECONFIG="$KUBECONFIG_FILE"
kubectl set image deployment/${K8S_DEPLOYMENT} ${K8S_CONTAINER}=${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} -n ${K8S_NAMESPACE}
kubectl rollout status deployment/${K8S_DEPLOYMENT} -n ${K8S_NAMESPACE} --timeout=180s
kubectl get pods -n ${K8S_NAMESPACE} -o wide
EOF
        }
      }
    }
  }

  post {
    always { sh 'docker logout || true' }
    success { echo "✅ Deployed ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}" }
    failure { echo '❌ Deployment failed — see logs above.' }
  }
}
