from queue import Queue
from threading import Thread

from transformers import StoppingCriteria


class Iteratorize:

    """
    Transforms a function that takes a callback
    into a lazy iterator (generator).

    Adapted from: https://stackoverflow.com/a/9969000
    """

    def __init__(self, func, kwargs=None, callback=None):
        self.mfunc = func
        self.c_callback = callback
        self.q = Queue()
        self.sentinel = object()
        self.kwargs = kwargs or {}
        self.stop_now = False

        def _callback(val):
            self.q.put(val)

        def gentask():
            try:
                ret = self.mfunc(callback=_callback, **self.kwargs)
            except ValueError as e:
                print(e)
                pass
            except Exception as e:
                print(e)
                pass

            self.q.put(self.sentinel)
            if self.c_callback:
                self.c_callback(ret)

        self.thread = Thread(target=gentask)
        self.thread.start()

    def __iter__(self):
        return self

    def __next__(self):
        obj = self.q.get(True, None)
        if obj is self.sentinel:
            raise StopIteration
        else:
            return obj

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop_now = True


class StreamAndStop(StoppingCriteria):
    def __init__(self, tokenizer, callback, stop="### Human:"):
        self.tokenizer = tokenizer
        self.callback = callback
        self.stop = stop

    def __call__(self, input_ids, *args, **kwargs) -> bool:
        prediction = self.tokenizer.decode(input_ids[0], skip_special_tokens=True)
        self.callback(prediction)
        return prediction.endswith(self.stop)
