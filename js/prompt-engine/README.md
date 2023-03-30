# Prompt Engine

Prompt Engine is a library intended to serve as middleware between an end-user and an LLM. It is explicitly inspired by LangChain and has a similar goal of providing a set of abstractions to allow for more powerful workflows which applications can build on top of.

There are some similaries to LangChain:

- An abstraction for a chain of programatically constructed messages which after yielding the desired response can be collapsed down to a single message, both for the end-user and in future prompts to the LLM.
- A concept of tools or skills, which can be used to allow Prompt Engine to complete tasks and provide context the model cannot natively perform.

And there are some key differences:

- A chat paradigm (e.g. system, user, and assistant messages in an array) as the only built-in representation of a conversation. Using Prompt Engine with a text completion model will require (a fairly simple) adapter.
- While chains can be "squashed" for future prompts, Prompt Engine doesn't make an effort to hide the communication used to yield the desired result. Users of the library can study and learn how the model is being steered towards the desired outcome, and they can easily manipulate and extend this part of the logic without needing to monkey patch the library itself.
- Fewer and narrower abstractions. The goal is simply to expose tools to manipulate prompts
- No built-in wrappers around LLM SDKs.
