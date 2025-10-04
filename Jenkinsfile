// File: Jenkinsfile
// Description: CI/CD pipeline with Docker build/push (fixed tag) and Kubernetes deploy.
//              Ensures changes are reflected by forcing a fresh pull and restart on every deploy.

pipeline {
  agent any
  options { timestamps() }

  environment {
    // ── Docker image (fixed tag as requested; no build-time in tag)
    IMAGE_NAME = 'ksanthosh200/swe645-site'
    IMAGE_TAG  = '1.0'

    // (Optional) default namespace; we’ll still read from kubeconfig at runtime
    K8S_NAMESPACE = 'default'
  }

  stages {

    stage('Checkout Code') {
      steps {
        checkout scm
        sh 'echo "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"'
      }
    }

    stage('Docker Build & Push (fixed tag)') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-credentials',   // Jenkins credential (Docker Hub user + Read/Write token)
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            set -euo pipefail

            # Defensive: clear any stale login
            docker logout || true

            # Login (masked in Jenkins logs)
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            # Build with fixed tag and also tag as latest
            docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
            docker tag  ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest

            # Push both tags
            docker push ${IMAGE_NAME}:${IMAGE_TAG}
            docker push ${IMAGE_NAME}:latest
          '''
        }
      }
    }

    // Download kubectl into workspace if the node doesn't have it
    stage('Prepare kubectl') {
      steps {
        sh '''
          set -euo pipefail
          mkdir -p .bin
          if [ ! -x .bin/kubectl ]; then
            echo "kubectl not found; downloading to .bin/ ..."
            VER="$(curl -Ls https://dl.k8s.io/release/stable.txt)"
            curl -L -o .bin/kubectl "https://dl.k8s.io/release/${VER}/bin/linux/amd64/kubectl"
            chmod +x .bin/kubectl
          fi
          ./.bin/kubectl version --client --output=yaml || true
        '''
      }
    }

    stage('Deploy to Kubernetes (force fresh pull & restart)') {
      environment {
        // Prepend our local kubectl to PATH only for this stage
        PATH = "${env.WORKSPACE}/.bin:${env.PATH}"
      }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
          sh '''
            set -euo pipefail
            export KUBECONFIG="$KUBECONFIG_FILE"

            echo "kubectl client:"
            kubectl version --client=true --output=yaml || true

            echo "Current context:"
            kubectl config current-context || true

            # Namespace from kubeconfig (fallback to default)
            NS="$(kubectl config view --minify -o jsonpath='{..namespace}' || true)"
            [ -z "$NS" ] && NS="${K8S_NAMESPACE}"
            echo "Using namespace: $NS"

            # (1) Ensure imagePullPolicy: Always so the pod pulls the tag even if unchanged
            #     Safe to apply repeatedly.
            kubectl patch deployment/deployment -n "$NS" --type='json' \
              -p='[{"op":"add","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"Always"}]' \
              || kubectl patch deployment/deployment -n "$NS" --type='json' \
                  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"Always"}]'

            # (2) Set image (even if tag is the same)
            kubectl set image deployment/deployment container-0=${IMAGE_NAME}:${IMAGE_TAG} -n "$NS" || true

            # (3) Force a rollout so pods are recreated and pull the image again
            kubectl rollout restart deployment/deployment -n "$NS"

            # (4) Wait for rollout to complete
            kubectl rollout status deployment/deployment -n "$NS" --timeout=180s

            # Visibility: what actually deployed?
            echo "Deployed image on deployment:"
            kubectl get deploy deployment -n "$NS" -o jsonpath="{.spec.template.spec.containers[0].image}{'\\n'}"

            echo "Pods:"
            kubectl get pods -n "$NS" -o wide

            echo "Pod images & digests:"
            kubectl get pods -n "$NS" -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{.spec.containers[0].image}{" | "}{.status.containerStatuses[0].imageID}{"\\n"}{end}'
          '''
        }
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
      echo 'Cleaning Up ...'
    }
    success {
      echo '✅ Deployment Successful, changes should now be visible.'
    }
    failure {
      echo '❌ Deployment Failed. See logs above.'
    }
  }
}
