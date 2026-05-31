from rest_framework import serializers
from apps.classes.models import SchoolClass


class ClassSerializer(serializers.ModelSerializer):

    class Meta:
        model = SchoolClass
        fields = "__all__"