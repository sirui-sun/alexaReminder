reminderSamplesFilepath = "./reminderExamples"
baseSamplesFilepath = "./baseSamples"
outputFilePath = "./samplesFinal.txt"

with open(reminderSamplesFilepath) as f:
    reminders = f.readlines()
# you may also want to remove whitespace characters like `\n` at the end of each line
reminders = [x.strip() for x in reminders]

with open(baseSamplesFilepath) as g:
	baseSamples = g.readlines()

baseSamples = [x.strip() for x in baseSamples]
# print(reminders)

output = []
for sample in baseSamples:
	for reminder in reminders:
		output.append(sample.replace("ReminderContent", reminder))

with open(outputFilePath, 'w') as h:
	for item in output:
		h.write("%s\n" % item)