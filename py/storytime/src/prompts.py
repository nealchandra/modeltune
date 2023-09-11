OUTLINE = '''{{#system~}}
You are the beloved author of childrens story books. You are going to write a children's story based on some guidance I provide to you.
{{~/system}}
{{#user~}}
Please create an outline of a childrens' story consisting of around 10 plot points, each one concisely summarizing a page of the story.
The story should have an imaginative, fantasy-oriented theme.
Do not include a title.
Do not include page numbers or page headers.

Please include the following characters as main characters in the story:
{{~#each characters}}
CHARACTER DESCRIPTION: {{this.description}}
{{~/each}}

Please include the following subjects or events in the story:
SUBJECT DESCRIPTION: {{subject}}
{{~/user}}
{{#assistant~}}
{{gen 'outline'}}
{{~/assistant}}
'''

STORY = '''
{{#user~}}
Now, using the outline you provided above, fill in the details of the story.
Turn each sentence into 2-4 sentences.
Remember to make the story whimsical and fun, something a young child would find exciting to read.
Remember to include characters, subjects, and events from above where you can.
{{~/user}}
{{#assistant~}}
{{gen 'story'}}
{{~/assistant}}
'''

TITLE = '''
{{#user~}}
Finally, generate a title for the story.
{{~/user}}
{{#assistant~}}
{{gen 'title'}}
{{~/assistant}}
'''

CHARACTER_BIOS = '''{{#system~}}
Your task is to read a story, and extract a list of characters from it. Some of these characters are known to us, so we will provide a short description of the character.

If a character is known, you should simply include the provided description. If the character was not provided, you should make up a short description/backstory (1 - 3 sentences). You can be imaginative as long as you don't contradict information from the story. Only include named characters.

Return the character descriptions in an unordered list format, with each list item following the pattern * NAME: DESCRIPTION. Do not include anything else in your response.
{{~/system}}
{{#user~}}
Known Characters:
{{~#each characters}}
* {{ this.name }}: {{ this.description}}
{{~/each}}

Story:
{{ story }}
{{~/user}}
{{#assistant~}}
{{gen 'full_characters' }}
{{~/assistant}}
'''

CHARACTER_DESCRIPTORS = '''{{#system~}}
Your task is to generate character descriptors for a given backstory. These characters descriptors will be fed into an image generation pipeline, and we want the character descriptors to be specific so there is consistency between different images.

You should invent your own details, but the goal is to be very detailed with lots of specifics on the characters PHYSICAL features.

You will be provided a list of characters with a brief description of them -- this can include their backstory, personality, and physical traits. You should use these to generate your DETAILED set of descriptors. Be concise, you don't need to return paragraph style descriptions, just a robust set of short descriptive tags.

You should provide somewhere between 4-12 specific descriptors for each character which together would form a fairly specific visual of the character. Focus mostly on PHYSICAL characteristics and again feel free to add or invent detail.

Return your response in the format: <CHARACTER_NAME>: <DESCRIPTIONS>, separating each character with a newline.
{{~/system}}
{{~#each full_characters}}
{{#user~}}
{{this.name}}: {{this.description}}
{{~/user}}
{{#assistant~}}
{{gen 'descriptors' list_append=True}}
{{~/assistant}}
{{~/each}}
'''

GENERATE_IMAGE_PROMPT = '''
{{#system~}}
Your task is to generate a prompt for an image generation AI. 

You will also be given a list of characters and a paragraph from a children's story. If the paragraph doesn't reference events that can easily be captured in an illustration, then simply return "SKIP". An example of where it would be appropriate to skip is if the paragraph is mostly focused on the character's inner dialogue, or describes a scene which is very hard to visualize. Otherwise, return a short and descriptive image prompt relevant to the paragraph content.

Write the prompt as if it is a description of the scene, not a request to an AI. Make it**as concise as possible**, it should be a series of short descriptions, not a complete sentence or paragraph. It should be 2-3 lines at most.

Your response should include the prompt and no other text at all. You should not attempt to continue the story in any way, just provide the image prompt.

Include lots of descriptive language, and make sure to reference the details from the provided visual descriptions. Do not add details that are inconsistent with the provided descriptions. Do not use emotional language or language about the character's thoughts. Only use language that describes the visuals of the scene.

Your response should NEVER under any circumstances contain proper nouns or a reference to the characters. Instead YOU MUST use the visual details provided in the character descriptions.
{{~/system}}
{{#user~}}
Character Descriptors:
{{~#each descriptors}}
{{ this }}
{{~/each}}
Paragraph:
{{ paragraph }}
{{~/user}}
{{#assistant~}}
{{gen "image_prompts" max_tokens=200}}
{{~/assistant}}
'''