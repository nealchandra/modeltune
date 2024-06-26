import modal

stub = modal.Stub(name="gpt-service")
finetunes_volume = modal.SharedVolume().persist("finetunes-dir")
models_volume = modal.SharedVolume().persist("models-dir")

stub.inference_image = (
    modal.Image.from_dockerhub(
        "nvidia/cuda:12.1.1-devel-ubuntu20.04",
        setup_dockerfile_commands=[
            "RUN apt-get update",
            "RUN apt-get install -y python3 python3-pip python-is-python3 git curl",
        ],
    )
    .pip_install("numpy", pre=True)
    .pip_install("torch", index_url="https://download.pytorch.org/whl/cu118")
    .pip_install_from_requirements("requirements.modal.txt")
    .copy_local_dir("../../py/gpt", "/gpt")
    .run_commands("pip install ../gpt")
)

stub.download_image = modal.Image.debian_slim().pip_install("huggingface_hub")
