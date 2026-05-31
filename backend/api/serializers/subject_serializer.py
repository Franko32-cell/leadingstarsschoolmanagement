from rest_framework import serializers
from apps.subjects.models import Subject


class SubjectSerializer(serializers.ModelSerializer):

    class_name = serializers.CharField(
        source="school_class.name",
        read_only=True
    )

    class Meta:
        model = Subject
        fields = "__all__"