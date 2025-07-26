



class QuizzTool:
    def __init__(self):
        self.quizzes = []
    
    def add_quiz(self, quiz):
        self.quizzes.append(quiz)
    
    def remove_quiz(self, quiz):
        self.quizzes.remove(quiz)
    
    def get_quizzes(self):
        return self.quizzes