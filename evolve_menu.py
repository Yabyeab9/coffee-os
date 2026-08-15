import re

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/MenusPage.tsx', 'r') as f:
    content = f.read()

# We'll see what the form looks like
print(content[content.find('type ItemForm = {'):content.find('const DEFAULT_ITEM_FORM')])

