// File: Jenkinsfile
// Description: CI/CD pipeline with Docker build/push to DockerHub, and Kubernetes deploy using kubeconfig

pipeline {
    agent any

    options { timestamps() }

    environment {
        // Image repo (update if needed)
        DOCKER_IMAGE_REPO = 'ksanthosh200/swe645-site'
        // Timestamp tag
        BUILD_TIMESTAMP   = "${new Date().format('yyyyMMddHHmmss')}"
    }

    stages {

        stage("Checkout Code") {
            steps {
                checkout scm
                sh 'echo "Building image with tag: ${BUILD_TIMESTAMP}"'
            }
        }

        stage("Docker Build & Push") {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-credentials', // Jenkins ID for DockerHub creds
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh <<'EOF'
set -euo pipefail

# DockerHub login (masked in Jenkins logs)
echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

# Build & tag image
docker build -t ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} .
docker tag ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} ${DOCKER_IMAGE_REPO}:latest

# Push to DockerHub
docker push ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}
docker push ${DOCKER_IMAGE_REPO}:latest
EOF
                }
            }
        }

        stage("Deploy to Kubernetes") {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh <<'EOF'
set -euo pipefail
export KUBECONFIG="$KUBECONFIG_FILE"

# Check current context from kubeconfig
kubectl config current-context

# Update deployment with new image (deployment & container names must exist in your cluster)
kubectl set image deployment/deployment container-0=${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} -n default

# Wait for rollout to complete
kubectl rollout status deployment/deployment -n default --timeout=180s
EOF
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment Successful: ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}"
        }
        failure {
            echo "❌ Deployment Failed. Check logs."
        }
        always {
            sh 'docker logout || true'
            echo "Pipeline finished."
        }
    }
}
